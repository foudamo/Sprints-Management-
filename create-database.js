const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    user: 'postgres',
    password: 'BzfZEbT6M1rYNP7ouy0e',
    host: 'sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'postgres', // Connect to default database
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'sprints'"
    );

    if (checkDb.rows.length === 0) {
      // Create the database if it doesn't exist
      await client.query('CREATE DATABASE sprints');
      console.log('Database "sprints" created successfully');
    } else {
      console.log('Database "sprints" already exists');
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.end();
  }
}

createDatabase();
