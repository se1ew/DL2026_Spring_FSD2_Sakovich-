const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://1234:1234@localhost:5432/qr_generator?schema=public'
});

async function test() {
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

test();
