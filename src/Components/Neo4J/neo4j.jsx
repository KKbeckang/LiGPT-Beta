import driver from './neo4jDriver'; // The file where you've set up the driver

async function fetchData(query, parameters = {}) {
  const session = driver.session();
  try {
    const result = await session.run(query, parameters);
    return result.records;
  } catch (error) {
    console.error('Error fetching data from Neo4j', error);
  } finally {
    await session.close();
  }
}