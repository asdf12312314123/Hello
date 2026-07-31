"""N자동화 실행 스크립트 (Python은 Node.js 서버를 실행해줌)"""
import subprocess
import os
import sys

if __name__ == "__main__":
    server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server", "index.js")
    
    env = os.environ.copy()
    env.pop("NODE_OPTIONS", None)  # 프록시 설정 제거
    
    print("=" * 50)
    print("  N자동화 v1.0.0 - 네이버 블로그 자동화 대시보드")
    print("=" * 50)
    print()
    print("  node server/index.js 실행 중...")
    print()
    
    subprocess.run(["node", server_path], env=env)
