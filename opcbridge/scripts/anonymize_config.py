#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path


def strip_json_comments(text: str) -> str:
    out = []
    i = 0
    in_str = False
    escape = False
    while i < len(text):
        ch = text[i]

        if in_str:
            out.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            i += 1
            continue

        if ch == '"':
            in_str = True
            out.append(ch)
            i += 1
            continue

        # Line comment
        if ch == "/" and i + 1 < len(text) and text[i + 1] == "/":
            i += 2
            while i < len(text) and text[i] not in "\r\n":
                i += 1
            continue

        # Block comment
        if ch == "/" and i + 1 < len(text) and text[i + 1] == "*":
            i += 2
            while i + 1 < len(text) and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2 if i + 1 < len(text) else 0
            continue

        out.append(ch)
        i += 1

    return "".join(out)


def load_json(path: Path) -> object:
    raw = path.read_text(encoding="utf-8")
    raw = strip_json_comments(raw)
    return json.loads(raw)


def dump_json(path: Path, obj: object) -> None:
    path.write_text(json.dumps(obj, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate anonymized *.example files from config/*.json")
    ap.add_argument("--config-dir", default="config", help="Config directory (default: config)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing *.example files")
    args = ap.parse_args()

    config_dir = Path(args.config_dir)
    conn_dir = config_dir / "connections"
    tags_dir = config_dir / "tags"

    conn_files = sorted(p for p in conn_dir.glob("*.json") if not p.name.endswith(".example"))
    tag_files = sorted(p for p in tags_dir.glob("*.json") if not p.name.endswith(".example"))

    # Build connection ID mapping from connection files
    conn_ids: list[str] = []
    conn_objs: dict[Path, dict] = {}
    for p in conn_files:
        obj = load_json(p)
        if not isinstance(obj, dict):
            continue
        conn_objs[p] = obj
        cid = obj.get("id")
        if isinstance(cid, str) and cid not in conn_ids:
            conn_ids.append(cid)

    conn_ids_sorted = sorted(conn_ids)
    conn_id_map = {cid: f"conn{idx+1:03d}" for idx, cid in enumerate(conn_ids_sorted)}

    # Build tag mapping per connection from tag files
    tag_map: dict[tuple[str, str], str] = {}
    plc_tag_map: dict[tuple[str, str], str] = {}
    per_conn_counter: dict[str, int] = {}

    def alloc_tag(conn_id: str, orig_name: str) -> str:
        key = (conn_id, orig_name)
        if key in tag_map:
            return tag_map[key]
        n = per_conn_counter.get(conn_id, 0) + 1
        per_conn_counter[conn_id] = n
        tag_map[key] = f"Tag{n:04d}"
        return tag_map[key]

    def alloc_plc_tag(conn_id: str, orig_plc: str) -> str:
        key = (conn_id, orig_plc)
        if key in plc_tag_map:
            return plc_tag_map[key]
        # Keep numbering aligned with tag counter for readability, but don't require it.
        n = per_conn_counter.get(conn_id, 0) + 1
        per_conn_counter[conn_id] = n
        plc_tag_map[key] = f"PLC_Tag{n:04d}"
        return plc_tag_map[key]

    for p in tag_files:
        obj = load_json(p)
        if not isinstance(obj, dict):
            continue
        orig_conn = obj.get("connection_id")
        if not isinstance(orig_conn, str):
            continue

        tags = obj.get("tags", [])
        if not isinstance(tags, list):
            continue

        # stable order by original name for deterministic numbering
        names = []
        for t in tags:
            if isinstance(t, dict) and isinstance(t.get("name"), str):
                names.append(t["name"])
        for nm in sorted(set(names)):
            alloc_tag(orig_conn, nm)

    # Write connection examples
    ip_counter = 1
    for p, obj in conn_objs.items():
        out = dict(obj)
        orig_id = out.get("id")
        if isinstance(orig_id, str):
            out["id"] = conn_id_map.get(orig_id, "conn000")

        # Always scrub gateway/description
        if "gateway" in out:
            out["gateway"] = f"192.0.2.{ip_counter}"
            ip_counter += 1
        if "description" in out:
            out["description"] = f"Example connection for {out.get('id', 'conn')}"

        out_path = p.with_suffix(p.suffix + ".example")
        if out_path.exists() and not args.overwrite:
            continue
        dump_json(out_path, out)

    # Write tags examples
    for p in tag_files:
        obj = load_json(p)
        if not isinstance(obj, dict):
            continue

        orig_conn = obj.get("connection_id")
        if not isinstance(orig_conn, str):
            continue

        out = dict(obj)
        out["connection_id"] = conn_id_map.get(orig_conn, "conn000")

        tags = out.get("tags", [])
        if isinstance(tags, list):
            new_tags = []
            for t in tags:
                if not isinstance(t, dict):
                    new_tags.append(t)
                    continue
                nt = dict(t)
                if isinstance(nt.get("name"), str):
                    nt["name"] = alloc_tag(orig_conn, nt["name"])
                if isinstance(nt.get("plc_tag_name"), str):
                    nt["plc_tag_name"] = alloc_plc_tag(orig_conn, nt["plc_tag_name"])
                new_tags.append(nt)
            out["tags"] = new_tags

        out_path = p.with_suffix(p.suffix + ".example")
        if out_path.exists() and not args.overwrite:
            continue
        dump_json(out_path, out)

    # alarms.json.example
    alarms_path = config_dir / "alarms.json"
    if alarms_path.exists():
        alarms = load_json(alarms_path)
        if isinstance(alarms, dict) and isinstance(alarms.get("alarms"), list):
            out = {"alarms": []}
            for idx, a in enumerate(alarms["alarms"]):
                if not isinstance(a, dict):
                    continue
                na = dict(a)
                if isinstance(na.get("id"), str):
                    na["id"] = f"Alarm{idx+1:03d}"
                oc = na.get("connection_id")
                if isinstance(oc, str):
                    na["connection_id"] = conn_id_map.get(oc, "conn000")
                ot = na.get("tag_name")
                if isinstance(ot, str) and isinstance(oc, str):
                    na["tag_name"] = alloc_tag(oc, ot)
                out["alarms"].append(na)
            out_path = alarms_path.with_suffix(".json.example")
            if not out_path.exists() or args.overwrite:
                dump_json(out_path, out)

    # mqtt_inputs.json.example
    mi_path = config_dir / "mqtt_inputs.json"
    if mi_path.exists():
        mi = load_json(mi_path)
        if isinstance(mi, dict) and isinstance(mi.get("inputs"), list):
            out = {"inputs": []}
            for idx, inp in enumerate(mi["inputs"]):
                if not isinstance(inp, dict):
                    continue
                ni = dict(inp)
                if isinstance(ni.get("id"), str):
                    ni["id"] = f"Input{idx+1:03d}"
                oc = ni.get("connection_id")
                ot = ni.get("tag_name")
                if isinstance(oc, str):
                    ni["connection_id"] = conn_id_map.get(oc, "conn000")
                if isinstance(ot, str) and isinstance(oc, str):
                    ni["tag_name"] = alloc_tag(oc, ot)
                # Scrub topic but keep structure
                ni["topic"] = f"example/{ni.get('connection_id','conn')}/{ni.get('tag_name','Tag')}"
                out["inputs"].append(ni)
            out_path = mi_path.with_suffix(".json.example")
            if not out_path.exists() or args.overwrite:
                dump_json(out_path, out)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
