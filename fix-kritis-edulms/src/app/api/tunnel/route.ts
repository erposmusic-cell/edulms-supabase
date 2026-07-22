import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';

// Global reference to the tunnel process
let tunnelProcess: any = null;
let tunnelUrl: string | null = null;
let tunnelLog: string[] = [];
let autoRestart = true;
let restartCount = 0;

function startTunnel(): Promise<string | null> {
  return new Promise(async (resolve) => {
    if (tunnelProcess) {
      resolve(tunnelUrl);
      return;
    }

    try {
      const { spawn } = await import('child_process');
      
      tunnelProcess = spawn('/tmp/cloudflared', [
        'tunnel', '--url', 'http://localhost:3000', '--protocol', 'auto'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      tunnelProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        tunnelLog.push(output);
        
        const match = output.match(/https:\/\/[a-z-]+\.trycloudflare\.com/);
        if (match) {
          tunnelUrl = match[0];
          console.log('[Tunnel] URL:', tunnelUrl);
          
          try {
            const fs = require('fs');
            fs.writeFileSync('/home/z/my-project/current-tunnel-url.txt', tunnelUrl);
          } catch {}
        }
      });

      tunnelProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        tunnelLog.push(output);
        
        const match = output.match(/https:\/\/[a-z-]+\.trycloudflare\.com/);
        if (match && !tunnelUrl) {
          tunnelUrl = match[0];
          console.log('[Tunnel] URL:', tunnelUrl);
          
          try {
            const fs = require('fs');
            fs.writeFileSync('/home/z/my-project/current-tunnel-url.txt', tunnelUrl);
          } catch {}
        }
      });

      tunnelProcess.on('exit', (code: number) => {
        console.log('[Tunnel] Process exited with code:', code);
        tunnelProcess = null;
        tunnelUrl = null;
        tunnelLog.push(`Process exited with code ${code}`);

        // Auto-restart after 5 seconds
        if (autoRestart) {
          restartCount++;
          console.log(`[Tunnel] Auto-restarting in 5 seconds... (restart #${restartCount})`);
          setTimeout(async () => {
            if (autoRestart) {
              await startTunnel();
            }
          }, 5000);
        }
      });

      // Wait for URL to be generated
      await new Promise(r => setTimeout(r, 8000));
      resolve(tunnelUrl);
    } catch (error: any) {
      console.error('[Tunnel] Start error:', error);
      resolve(null);
    }
  });
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  return NextResponse.json({
    status: tunnelProcess ? 'running' : 'stopped',
    url: tunnelUrl,
    restartCount,
    autoRestart,
    logs: tunnelLog.slice(-10),
  });
}

export async function POST() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (tunnelProcess) {
    return NextResponse.json({
      status: 'already_running',
      url: tunnelUrl,
    });
  }

  autoRestart = true;
  const url = await startTunnel();

  return NextResponse.json({
    status: 'started',
    url: url,
    autoRestart: true,
    message: url 
      ? `Tunnel active at ${url}` 
      : 'Tunnel started but URL not yet available. Check again with GET request.',
  });
}

export async function DELETE() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  autoRestart = false;
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    tunnelUrl = null;
  }
  return NextResponse.json({ status: 'stopped', autoRestart: false });
}
