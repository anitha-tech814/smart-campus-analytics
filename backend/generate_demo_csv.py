from app.services.data_service import generate_synthetic_demo_data
from app.config import DEMO_RECORD_COUNT
import pandas as pd
import os
import sys

count = int(sys.argv[1]) if len(sys.argv) > 1 else DEMO_RECORD_COUNT
records = generate_synthetic_demo_data(count)
df = pd.DataFrame(records)

output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(output_dir, exist_ok=True)
out_path = os.path.join(output_dir, "demo_students.csv")
df.to_csv(out_path, index=False)
print("Generated", out_path, "with", len(df), "records")