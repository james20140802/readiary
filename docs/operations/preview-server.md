# 미리보기 서버를 계속 열어 두기

## 이번 작업에서 확인한 문제

도구 실행 세션으로 시작한 서버가 이후 사라지는 현상이 반복됐다. 종료 원인을
프로세스 로그로 확정한 것은 아니지만, 사용자용 서버를 도구 세션 수명에 기대지
않도록 바꿨다. 새 세션으로 분리한 서버는 시작 명령이 끝난 뒤 부모 PID 1,
대기 포트, 실제 미리보기 경로의 HTTP 200을 확인했다.

Next.js 16의 CLI를 `node -e` 또는 `node --env-file=...`로 직접 실행하면
자식 프로세스에서 `--e= is not allowed in NODE_OPTIONS` 또는
`--env-file= is not allowed in NODE_OPTIONS`가 재현됐다. `.cjs` 파일에서
환경을 읽고 CLI를 호출하는 방식으로 해결했다.

Watchpack의 `EMFILE` 때문에 파일 이동·수정이 감지되지 않아 예전 화면이나
404가 보이기도 했다. 폴링을 켠 뒤 서버를 재시작하고 최신 화면을 다시 확인했다.

## 실행 전 확인

1. `git worktree list`와 해당 worktree의 상태로 작업 경로를 확인한다.
2. `lsof -nP -iTCP:<포트> -sTCP:LISTEN`으로 점유 여부를 확인한다. 점유 중이면
   프로세스 명령과 worktree를 대조한다. 정상인 같은 작업 서버는 재사용한다.
3. 의존성과 실제 미리보기 파일, 승인된 환경 공급 경로가 있는지 확인한다.
   아래 실행 예제는 `process.loadEnvFile`을 제공하는 Node가 필요하다(Node 20 계열은
   20.12.0 이상). 서버에 사용할 Node 실행 파일의 `--version`과 해당 함수 제공 여부를
   확인한다. Next 자체의 최소 버전과 이 예제의 요구 조건은 다르다.
4. 아래 예시의 경로와 포트를 실제 확인한 값으로 바꾼다. 임시 파일·로그 이름도
   작업별로 다르게 정한다. 비밀값이나 실제 계정 기록을 로그에 쓰지 않는다.

## 독립 프로세스로 실행

작업 전용 `.cjs` 파일을 만든다. 예시 경로는 자리표시자이며 그대로 실행하지 않는다.

```js
// /private/tmp/<작업명>-server.cjs
if (typeof process.loadEnvFile !== 'function') {
  console.error('이 실행 예제는 process.loadEnvFile을 지원하는 Node가 필요합니다. Node 20 계열은 20.12.0 이상을 사용하세요.');
  process.exit(1);
}
process.loadEnvFile('/승인된/환경파일/경로');
process.env.WATCHPACK_POLLING = '1000';
const cli = '/작업/worktree/node_modules/next/dist/bin/next';
process.argv = [process.execPath, cli, 'dev', '--webpack', '-p', '3100'];
require(cli);
```

`node -e`나 `node --env-file`로 이 CLI를 감싸지 않는다. 이 파일을 별도 세션에서
실행한다. 샌드박스가 독립 실행을 제한하면 요청된 서버 실행 범위로 권한을 요청한다.

```python
import subprocess
from pathlib import Path

with open('/private/tmp/<작업명>-server.log', 'a') as log:
    process = subprocess.Popen(
        ['/확인한/node/절대경로', '/private/tmp/<작업명>-server.cjs'],
        cwd='/작업/worktree',
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
        close_fds=True,
    )
Path('/private/tmp/<작업명>-server.pid').write_text(str(process.pid) + '\n')
```

시작 명령이 반환된 뒤 **새로운 도구 호출**에서 확인한다.

```sh
ps -p <기록한PID> -o pid=,ppid=,stat=,command=
lsof -nP -iTCP:3100 -sTCP:LISTEN
curl -sS --max-time 30 -o /dev/null -w 'HTTP %{http_code}\n' \
  http://127.0.0.1:3100/<실제-미리보기-경로>
```

macOS에서 분리된 프로세스의 부모 PID는 1이다. Next 서버가 별도 자식 PID로
포트를 듣는 것은 정상이다. 실패하면 이 작업의 로그를 확인한다. PID만 존재하거나
Ready 로그만 있는 상태는 접속 성공이 아니다. 이 방식은 재부팅 자동 실행이나
장애 시 자동 재시작을 제공하지 않으며, Mac과 Tailscale이 사용 가능한 동안의
미리보기 제공을 위한 것이다.

## Tailscale로 모바일·태블릿 연결

먼저 `tailscale status`와 `tailscale serve status`, 설치된 CLI의
`tailscale serve --help`를 확인한다. 다른 서비스가 HTTPS 443을 사용 중이면
그 매핑을 보존하고 비어 있는 별도 포트를 고른다. 아래는 8443이 비었을 때의 예시다.

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:3100
tailscale serve status
curl -sS --max-time 30 -o /dev/null -w 'HTTPS %{http_code}\n' \
  https://<현재-MagicDNS-호스트>:8443/<실제-미리보기-경로>
```

인증서 검증을 끄는 `curl -k`로 성공을 대신하지 않는다. Serve는 tailnet 내부
접속이며, 인터넷 공개인 Funnel로 전환하지 않는다. 기존 Serve 전체 reset도 하지 않는다.
현재 앱이 열리는지, JavaScript·글꼴·개발 WebSocket이 정상인지 브라우저에서 확인한다.
Next가 개발 Origin을 차단하면 해당 버전의 `allowedDevOrigins` 동작을 확인하고
필요한 호스트만 설정한다. 전체 도메인 와일드카드로 우회하지 않는다.

모바일·태블릿에서는 같은 tailnet에 로그인한 Tailscale을 켠 뒤 안내한 HTTPS URL을
브라우저에서 연다. Mac에서 받은 HTTPS 200은 상대 기기의 실제 조작 확인을 뜻하지 않는다.
합성 기록 미리보기와 실제 로그인·운영 DB·iOS 설치형 PWA 검증을 구분한다.

## 종료와 정리

- PID 파일의 번호와 현재 프로세스 명령·작업 경로를 대조한다. PID 재사용에 주의한다.
- 확인된 서버 및 자식 프로세스만 종료하고 해당 포트가 닫혔는지 확인한다.
- 이 작업이 만든 Serve 설정만 `tailscale serve --https=8443 off`로 끈다.
- 다른 Serve 매핑은 그대로 두고, 필요한 캡처·로그를 보존한 뒤 작업 파일을 정리한다.
- 서버를 제공 중인 worktree는 제거하지 않는다. PR 머지 후 정리 전에도 동일하게 확인한다.
