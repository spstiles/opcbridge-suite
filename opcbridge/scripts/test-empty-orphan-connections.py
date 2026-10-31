#!/usr/bin/env python3
"""Check driver loading without PLC traffic or changes to the installed service."""
import argparse
import json
import pathlib
import re
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", type=pathlib.Path,
                        default=pathlib.Path(__file__).resolve().parents[1] / "opcbridge")
    args = parser.parse_args()
    binary = args.binary.resolve()
    with tempfile.TemporaryDirectory(prefix="opcbridge-empty-orphans-") as folder:
        root = pathlib.Path(folder)
        (root / "connections").mkdir()
        (root / "tags").mkdir()

        def tags(name, values, extension="json"):
            (root / "tags" / f"{name}.{extension}").write_text(
                json.dumps({"connection_id": name, "tags": values}))

        for name in ["FieldOps1", "FieldOps2", "FieldOps3", "field_ops"]:
            tags(name, [])
        tags("LegacyJsonc", [], "jsonc")
        # Nonempty legitimate memory groups must remain supported, including
        # memory values attached to a configured physical connection.
        memory = {"name": "Value", "source": "memory", "datatype": "int32",
                  "initial_value": "7"}
        tags("ApplicationMemory", [memory])
        tags("_memory", [memory])
        tags("Field_Ops", [memory])
        (root / "connections" / "Field_Ops.json").write_text(json.dumps({
            "id": "Field_Ops", "driver": "ab_eip", "plc_type": "lgx",
            "gateway": "127.0.0.1", "path": "1,0"}))
        # Orphan PLC tags must not become virtual memory connections either.
        tags("OrphanPLC", [{"name": "Missing", "datatype": "bool",
                            "plc_tag_name": "Missing"}])

        result = subprocess.run([str(binary), "--config", str(root), "--dump-json"],
                                cwd=root, text=True, capture_output=True, timeout=30)
        assert result.returncode == 0, result.stdout + result.stderr
        loaded = set(re.findall(r"Connection '([^']+)' has \d+ tag", result.stdout))
        expected = {"Field_Ops", "ApplicationMemory", "_memory"}
        assert loaded == expected, f"Expected {expected}, got {loaded}"
        match = re.search(r'\{\s*"tags"\s*:', result.stdout)
        assert match, result.stdout
        document, _ = json.JSONDecoder().raw_decode(result.stdout[match.start():])
        assert {tag["connection_id"] for tag in document["tags"]} == expected
        assert all(tag["value"] == 7 and tag["quality"] == 1
                   for tag in document["tags"])
    print("Empty orphan connections excluded; configured and virtual memory tags preserved.")


if __name__ == "__main__":
    main()
