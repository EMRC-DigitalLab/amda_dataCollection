import Queue from 'bull';

// Hardcode locally for the test to rule out config issues
const redisConfig = {
  host: 'localhost',
  port: 6379,
};

console.log(`Testing Redis connection to ${redisConfig.host}:${redisConfig.port}...`);

const testQueue = new Queue('test-connection-script', {
  redis: redisConfig,
});

testQueue.client.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
  testQueue.close();
  process.exit(1);
});

testQueue.client.on('ready', () => {
  console.log('Redis Client Ready! Connection Successful.');
  testQueue.close().then(() => process.exit(0));
});

// Timeout the test script itself if it hangs
setTimeout(() => {
  console.error('Timeout: Could not connect to Redis within 5 seconds. Is Redis running?');
  process.exit(1);
}, 5000);
