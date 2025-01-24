import { io } from 'socket.io-client';

const isDev = process.env.NODE_ENV === 'development';
const serverUrl = isDev ? 'http://localhost:3000' : window.location.origin;

const socket = io(serverUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  withCredentials: true,
  forceNew: true,
  autoConnect: true,
  path: '/socket.io/',
  upgrade: true,
  rememberUpgrade: true,
  transports: ['websocket'],
  transportOptions: {
    polling: {
      extraHeaders: {
        'User-Agent': 'socket.io-client'
      }
    }
  }
});

socket.on('connect', () => {
  console.log('Connected to server at:', serverUrl);
  console.log('Socket ID:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
  console.log('Protocol:', window.location.protocol);
  console.log('Connection state:', socket.connected ? 'connected' : 'disconnected');
  console.log('Transport options:', socket.io.opts.transportOptions);
});

socket.on('connection-established', (data) => {
  console.log('Connection established:', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  console.error('Error details:', {
    message: error.message,
    description: error.description,
    type: error.type,
    transport: socket.io.engine?.transport?.name
  });
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

export default socket; 