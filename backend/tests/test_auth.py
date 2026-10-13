import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User
from app.services.auth_service import ensure_demo_users

# Use in-memory SQLite with StaticPool so all sessions share the same in-memory DB
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class AuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)
        db = TestingSessionLocal()
        try:
            ensure_demo_users(db)
        finally:
            db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=test_engine)

    def test_01_demo_accounts_endpoint(self):
        res = self.client.get("/api/auth/demo-accounts")
        self.assertEqual(res.status_code, 200)
        accounts = res.json()
        self.assertGreaterEqual(len(accounts), 3)
        roles = {a["role"] for a in accounts}
        self.assertIn("advisor", roles)
        self.assertIn("faculty", roles)
        self.assertIn("admin", roles)

    def test_02_demo_login_success(self):
        res = self.client.post("/api/auth/login", json={
            "email": "advisor@campus.edu",
            "password": "Advisor123!"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "advisor")

    def test_03_login_invalid_password(self):
        res = self.client.post("/api/auth/login", json={
            "email": "advisor@campus.edu",
            "password": "WrongPassword!"
        })
        self.assertEqual(res.status_code, 401)

    def test_04_register_new_user_success(self):
        res = self.client.post("/api/auth/register", json={
            "email": "counselor.patel@campus.edu",
            "password": "SecurePassword123!",
            "full_name": "Priya Patel",
            "role": "faculty",
            "department": "Mechanical Engineering"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], "counselor.patel@campus.edu")
        self.assertEqual(data["user"]["role"], "faculty")

    def test_05_register_duplicate_email(self):
        res = self.client.post("/api/auth/register", json={
            "email": "counselor.patel@campus.edu",
            "password": "AnotherPassword123!",
            "full_name": "Priya Patel",
            "role": "advisor"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.json()["detail"])

    def test_06_register_short_password(self):
        res = self.client.post("/api/auth/register", json={
            "email": "test.short@campus.edu",
            "password": "123",
            "full_name": "Test Short"
        })
        self.assertEqual(res.status_code, 400)

    def test_07_me_endpoint_with_valid_token(self):
        # First login
        login_res = self.client.post("/api/auth/login", json={
            "email": "admin@campus.edu",
            "password": "Admin123!"
        })
        token = login_res.json()["access_token"]

        # Call /api/auth/me
        me_res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["role"], "admin")

    def test_08_me_endpoint_unauthorized(self):
        me_res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        self.assertEqual(me_res.status_code, 401)


if __name__ == "__main__":
    unittest.main()
