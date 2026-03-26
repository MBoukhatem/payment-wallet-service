const verifyServiceToken = (req, res, next) => {
  const token = req.headers['x-service-token']
  if (!token || token !== process.env.SERVICE_TOKEN) {
    return res.status(403).json({ error: 'Invalid service token' })
  }
  next()
}

module.exports = { verifyServiceToken }
