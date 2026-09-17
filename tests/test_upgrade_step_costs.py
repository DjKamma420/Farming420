import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class UpgradeStepCostGenerationTest(unittest.TestCase):
    def test_generated_step_cost_snapshot_is_current(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "build-upgrade-step-costs.py"), "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("step-cost snapshot is current", result.stdout)


if __name__ == "__main__":
    unittest.main()
