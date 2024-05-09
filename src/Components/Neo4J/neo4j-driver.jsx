import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'neo4j+s://4013e16e.databases.neo4j.io',  // This is the default URI; change it if your database is hosted elsewhere.
  neo4j.auth.basic('neo4j', 'VDmPllshrEcn7aguGdwu5haCHHff7Fom5LsUR9YuXEY')  // Replace with your Neo4j credentials.
);

export default driver;