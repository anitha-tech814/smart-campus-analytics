"""
Project file discovery and section-aware chunking for the local RAG index.

Safety / scoping rules:
  * Only files strictly inside the project root are ever read.
  * Well-known dependency / build / secret directories are skipped.
  * Sensitive file names (.env, *.key, credentials, tokens, ...) are skipped.
  * Data artifacts (.db/.csv/.xlsx/...) are handled by the live-data engine, not
    chunked here.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List

from app.services.rag import config

# Section boundary patterns (used to give chunks a human-meaningful "section").
_MD_HEADING = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
_PY_SECTION = re.compile(r"^(?:async\s+)?(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)\b")
_TS_SECTION = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?"
    r"(?:function|class|interface|type|enum|const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\b"
)


@dataclass
class Chunk:
    chunk_id: str
    source: str          # project-relative path
    section: str         # heading / symbol name ("" when unknown)
    category: str        # "doc" | "code" | "config"
    start_line: int
    end_line: int
    text: str
    meta: dict = field(default_factory=dict)


def _is_sensitive(rel_path: str) -> bool:
    lowered = rel_path.lower()
    return any(frag in lowered for frag in config.EXCLUDE_NAME_FRAGMENTS)


def _category_for(ext: str) -> str:
    if ext in (".md", ".txt"):
        return "doc"
    if ext in (".json", ".toml", ".yml", ".yaml", ".cfg", ".ini", ".bat"):
        return "config"
    return "code"


def discover_files(root: str | None = None) -> List[str]:
    """Return project-relative paths of indexable text files (sorted)."""
    root = os.path.abspath(root or config.PROJECT_ROOT)
    discovered: List[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories in-place so os.walk never descends into them.
        dirnames[:] = [
            d for d in dirnames
            if d not in config.EXCLUDE_DIRS and not d.startswith(".git")
        ]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in config.EXCLUDE_EXTENSIONS:
                continue
            if ext not in config.INCLUDE_EXTENSIONS:
                continue
            abs_path = os.path.join(dirpath, name)
            # Guard against symlinks that escape the project root.
            if not os.path.abspath(abs_path).startswith(root + os.sep):
                continue
            rel = os.path.relpath(abs_path, root).replace("\\", "/")
            if rel.startswith(config.EXCLUDE_REL_PREFIXES):
                continue
            if _is_sensitive(rel):
                continue
            try:
                if os.path.getsize(abs_path) > config.MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            discovered.append(rel)
    return sorted(discovered)


def read_text_file(root: str, rel_path: str) -> str | None:
    abs_path = os.path.join(root, rel_path)
    try:
        with open(abs_path, "rb") as handle:
            raw = handle.read()
    except OSError:
        return None
    if b"\x00" in raw[:4096]:  # binary guard
        return None
    return raw.decode("utf-8", errors="replace")


def _section_for(line: str, ext: str) -> str | None:
    if ext == ".md":
        match = _MD_HEADING.match(line)
        return match.group(2).strip() if match else None
    if ext == ".py":
        match = _PY_SECTION.match(line)
        return match.group(1) if match else None
    if ext in (".ts", ".tsx", ".js", ".jsx"):
        match = _TS_SECTION.match(line)
        return match.group(1) if match else None
    return None


def _split_block(
    lines: List[str], start_line: int, section: str
) -> List[tuple]:
    """Split a list of lines into (start_line, end_line, text) char-bounded pieces."""
    pieces: List[tuple] = []
    buffer: List[str] = []
    buffer_start = start_line
    size = 0

    def flush():
        nonlocal buffer, size, buffer_start
        if not buffer:
            return
        text = "\n".join(buffer).strip()
        if text:
            pieces.append((buffer_start, buffer_start + len(buffer) - 1, text))
        buffer = []
        size = 0

    for offset, line in enumerate(lines):
        ln = start_line + offset
        if not buffer:
            buffer_start = ln
        buffer.append(line)
        size += len(line) + 1
        if size >= config.CHUNK_SIZE:
            flush()
            # Build a small overlap tail from the previous chunk for context continuity.
            overlap_lines = max(1, config.CHUNK_OVERLAP // 60)
            tail = buffer[-overlap_lines:] if buffer else lines[max(0, offset - overlap_lines): offset]
            buffer = list(tail)
            buffer_start = ln - len(buffer) + 1
            size = sum(len(x) + 1 for x in buffer)
    flush()
    return pieces


def chunk_text(rel_path: str, text: str) -> List[Chunk]:
    """Split a file's text into section-aware chunks with line metadata."""
    ext = os.path.splitext(rel_path)[1].lower()
    category = _category_for(ext)
    lines = text.splitlines()
    if not lines:
        return []

    # Group lines into sections based on detected boundaries.
    sections: List[tuple] = []  # (section_name, start_line_no, lines)
    current_name = ""
    current_lines: List[str] = []
    current_start = 1

    def close_section():
        if current_lines:
            sections.append((current_name, current_start, current_lines))

    for idx, line in enumerate(lines, start=1):
        boundary = _section_for(line, ext)
        if boundary and current_lines:
            close_section()
            current_lines = []
            current_start = idx
        if boundary:
            current_name = boundary
            current_start = idx
        elif not current_lines:
            current_start = idx
        current_lines.append(line)
    close_section()

    chunks: List[Chunk] = []
    counter = 0
    for name, start_no, block_lines in sections:
        for (s, e, body) in _split_block(block_lines, start_no, name):
            counter += 1
            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}#{counter}",
                    source=rel_path,
                    section=name or "",
                    category=category,
                    start_line=s,
                    end_line=e,
                    text=body,
                    meta={"ext": ext, "chars": len(body)},
                )
            )
    return chunks
