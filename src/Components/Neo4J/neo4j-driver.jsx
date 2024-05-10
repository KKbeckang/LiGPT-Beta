import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  '',  // This is the default URI; change it if your database is hosted elsewhere.
  neo4j.auth.basic('', '')  // Replace with your Neo4j credentials.
);

export default driver;