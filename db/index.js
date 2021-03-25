const { Pool } = require('pg')
const pool = new Pool({
  ssl: true,
  ssl: {
  rejectUnauthorized: false,
  }
})
module.exports = {
    query: (text, params, callback) => {
        return pool.query(text, params, callback)
    },
}
