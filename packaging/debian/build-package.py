#!/usr/bin/env python3
"""Assemble a prebuilt Debian 13 amd64 package; no installed site files are read."""
import hashlib, os, pathlib, shutil, subprocess, sys, tempfile
root=pathlib.Path(__file__).resolve().parents[2]
os.chdir(root)
os_release=dict(line.split('=',1) for line in pathlib.Path('/etc/os-release').read_text().splitlines() if '=' in line)
if os_release.get('ID','').strip(chr(34)) != 'debian' or os_release.get('VERSION_ID','').strip(chr(34)) != '13':
    raise SystemExit('Package assembly requires Debian 13')
if subprocess.check_output(['dpkg','--print-architecture'],text=True).strip()!='amd64':
    raise SystemExit('First package targets amd64 only')
version=(root/'VERSION').read_text().strip()+'-1'
out=pathlib.Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
stage=pathlib.Path(tempfile.mkdtemp(prefix='opcbridge-deb-'))
opt=stage/'opt/opcbridge-suite'
def copy(src,dst,mode=None):
    src=pathlib.Path(src);dst=stage/str(dst).lstrip('/')
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst)
    if mode is not None: dst.chmod(mode)
tracked=subprocess.check_output(['git','ls-files','-z'],text=True).split('\0')
for module,folder in [('opcbridge-scada','scada'),('opcbridge-hmi','hmi')]:
    for name in tracked:
        if not name.startswith(module+'/'): continue
        rel=pathlib.Path(name).relative_to(module)
        if rel.parts[0] in ('test','docs','screens') or name.endswith('.example') or name.endswith('.md'): continue
        if rel.name in ('config.json','config.secrets.json','passwords.jsonc','audit.jsonl') or name.endswith('config.jsonc'): continue
        copy(root/name,f'/opt/opcbridge-suite/{folder}/{rel}')
# Locked dependencies are installed in the disposable build directory only.
shutil.copytree(root/'opcbridge-hmi/node_modules',opt/'hmi/node_modules')
for module,src in [('opcbridge','opcbridge/opcbridge'),('opcbridge-alarms','opcbridge-alarms/build/opcbridge-alarms'),('opcbridge-flow','opcbridge-flow/opcbridge-flow'),('opcbridge-logger','opcbridge-logger/opcbridge-logger'),('opcbridge-historian','opcbridge-historian/opcbridge-historian')]:
    copy(root/src,f'/opt/opcbridge-suite/bin/{module}',0o755)
    subprocess.run(['patchelf','--set-rpath','$ORIGIN/../lib',str(opt/'bin'/module)],check=True)
copy(root/'opcbridge/scripts/provision-opcua-identity.sh','/opt/opcbridge-suite/bin/opcbridge-provision-opcua-identity',0o755)
copy(root/'opcbridge-historian/migrate-timescaledb.sh','/opt/opcbridge-suite/bin/opcbridge-historian-migrate',0o755)
for lib in pathlib.Path('/usr/local/lib').glob('libplctag.so*'):
    dst=opt/'lib'/lib.name;dst.parent.mkdir(parents=True,exist_ok=True)
    if lib.is_symlink(): dst.symlink_to(os.readlink(lib))
    else: shutil.copy2(lib,dst)
for name in ('opcbridge-report','composer.json','composer.lock','VERSION'):
    copy(root/'opcbridge-report'/name,f'/opt/opcbridge-suite/report/{name}')
shutil.copytree(root/'opcbridge-report/vendor',opt/'report/vendor')
(opt/'report/opcbridge-report').chmod(0o755)
(opt/'bin/opcbridge-report').symlink_to('../report/opcbridge-report')
copy(root/'VERSION','/opt/opcbridge-suite/VERSION')
copy(root/'VERSION','/usr/lib/opcbridge-suite/VERSION')
copy(root/'install.sh','/usr/lib/opcbridge-suite/installer-functions.sh')
copy(root/'packaging/debian/configure','/usr/lib/opcbridge-suite/configure',0o755)
copy(root/'LICENSE','/usr/share/doc/opcbridge-suite/copyright')
copy(root/'THIRD_PARTY_NOTICES.md','/usr/share/doc/opcbridge-suite/THIRD_PARTY_NOTICES.md')
for src in (root/'third_party/licenses').rglob('*'):
    if src.is_file(): copy(src,f'/usr/share/doc/opcbridge-suite/licenses/{src.relative_to(root/"third_party/licenses")}')
copy(root/'packaging/debian/README.md','/usr/share/doc/opcbridge-suite/README.md')
# Default templates are never package-owned live settings.
for module in ('opcbridge','opcbridge-alarms'):
    for src in (root/module/'config').rglob('*.example'):
        copy(src,'/usr/share/opcbridge-suite/defaults/'+str(src.relative_to(root/module/'config')))
for module in ('scada','logger','flow','report','historian'):
    for src in (root/f'opcbridge-{module}').glob('*.example'):
        copy(src,f'/usr/share/opcbridge-suite/defaults/{module}/{src.name}')
copy(root/'opcbridge-historian/schema.sql','/usr/share/opcbridge-suite/defaults/historian/schema.sql')
copy(root/'opcbridge-historian/schema.sql','/opt/opcbridge-suite/share/opcbridge-historian/schema.sql')
# Generate the same service definitions as install.sh, without host changes.
unitdir=stage/'usr/lib/systemd/system';unitdir.mkdir(parents=True)
script='''source ./install.sh
COMPONENTS=(opcbridge alarms scada hmi logger historian flow)
START_SERVICES=0
ENABLE_SERVICES=0
systemctl() { return 0; }
write_unit() { printf '%s\\n' "$2" > "$UNITDIR/$1"; }
install_systemd_units
'''
subprocess.run(['bash','-c',script],env={**os.environ,'UNITDIR':str(unitdir)},check=True)
# Capture bundled third-party notices and exact source distributions.
third=pathlib.Path(os.environ.get('OPCBRIDGE_THIRD_PARTY_SOURCE','/nonexistent'))
for folder in ('libplctag','ixwebsocket'):
    if not (third/folder).exists(): raise SystemExit('Missing third-party source/license provenance')
    for src in (third/folder).rglob('*'):
        if src.is_file() and '.git' not in src.parts and ('LICENSE' in src.name.upper() or 'COPYING' in src.name.upper()):
            copy(src,f'/usr/share/doc/opcbridge-suite/third-party/{folder}/{src.relative_to(third/folder)}')
subprocess.run(['tar','--exclude=.git','-czf',str(out/f'opcbridge-suite_{version}_dependency-sources.tar.gz'),'-C',str(third),'libplctag','ixwebsocket'],check=True)
# Resolve the ELF runtime libraries from this Debian build, not host Mint libraries.
meta=stage/'DEBIAN';meta.mkdir()
control='''Source: opcbridge-suite
Section: net
Priority: optional
Maintainer: spstiles <spstiles@gmail.com>

Package: opcbridge-suite
Architecture: amd64
Description: OPCBridge industrial automation suite
'''
(root/'debian').mkdir(exist_ok=True)
(root/'debian/control').write_text(control)
elfs=[p for p in (opt/'bin').iterdir() if p.is_file() and p.read_bytes()[:4]==b'\x7fELF']
result=subprocess.check_output(['dpkg-shlibdeps','--ignore-missing-info','-O',f'-l{opt}/lib',*[f'-e{p}' for p in elfs]],text=True)
libs=result.strip().removeprefix('shlibs:Depends=')
# libplctag has no dpkg shlibs record because it is bundled privately.
depends=libs+', nodejs (>= 20), python3, python3-olefile, php-cli (>= 2:8.1), php-gd, php-mbstring, php-xml, php-zip, php-curl, php-intl, openssl, passwd, init-system-helpers, systemd'
(meta/'control').write_text(f'''Package: opcbridge-suite
Version: {version}
Architecture: amd64
Maintainer: spstiles <spstiles@gmail.com>
Section: net
Priority: optional
Depends: {depends}
Recommends: ca-certificates, alsa-utils, espeak-ng, sox, libsox-fmt-mp3, baresip
Suggests: postgresql, tdsodbc
Homepage: https://github.com/spstiles/opcbridge-suite
Description: OPCBridge industrial automation suite (experimental Debian 13 package)
 Includes the bridge, alarms, SCADA, HMI, logger, historian, flow runtime,
 and report generator. User configuration and data are preserved on removal.
 Services and historian database initialization require explicit configuration.
''')
for name in ('postinst','prerm','postrm'): copy(root/'packaging/debian'/name,f'/DEBIAN/{name}',0o755)
# Readability of application/dependency trees must not depend on build umask.
for path in stage.rglob('*'):
    if path.is_symlink(): continue
    if path.is_dir(): path.chmod(0o755)
    elif path.parts[-2]!='DEBIAN': path.chmod(0o755 if path.stat().st_mode & 0o111 else 0o644)
(meta/'md5sums').write_text(''.join(f'{hashlib.md5(p.read_bytes()).hexdigest()}  {p.relative_to(stage)}\n' for p in sorted(stage.rglob('*')) if p.is_file() and not p.is_symlink() and meta not in p.parents))
package=out/f'opcbridge-suite_{version}_amd64.deb'
subprocess.run(['dpkg-deb','-Zzstd','-z9','--threads-max=2','--root-owner-group','--build',str(stage),str(package)],check=True)
print(package)
shutil.rmtree(stage)
