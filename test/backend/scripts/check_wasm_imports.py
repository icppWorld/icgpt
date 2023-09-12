"""Asserts that a .wat file contains only ic0 imports

Usage:
    python -m test.scripts.check_wasm_imports build/test_canister_api.wat

"""
import sys
import argparse
import pathlib

ROOT_PATH = pathlib.Path(__file__).parent.parent.parent.parent.resolve()


def parse_args() -> str:
    """Get the args"""
    parser = argparse.ArgumentParser(prog="check_wasm_imports")
    parser.add_argument("wat_file", nargs="+", help="The .wat file to assert.")
    args = parser.parse_args()

    return str(args.wat_file[0])


def check_wasm_imports(wat_file: str) -> int:
    """Check that the .wat file only contains imports from ic0"""
    with open(ROOT_PATH / wat_file, encoding="utf-8") as f:
        for line in f.readlines():
            if "import" in line and '(import "ic0"' not in line:
                print(f"     {line}")
                print(f"  ❌: Non ic0 system import found in {wat_file}")
                print("===============================================================")
                return 1

    return 0


def main() -> int:
    """Executes the assert"""
    wat_file = parse_args()
    return check_wasm_imports(wat_file)


if __name__ == "__main__":
    sys.exit(main())
