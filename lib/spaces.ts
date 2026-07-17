function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/$/, "")
}

export function getSpacesEndpoint() {
  const endpoint = process.env.DO_SPACES_ENDPOINT

  if (!endpoint) {
    throw new Error("Missing required environment variable: DO_SPACES_ENDPOINT")
  }

  return normalizeEndpoint(endpoint)
}

export function getSpacesBucket() {
  const bucket = process.env.DO_SPACES_BUCKET

  if (!bucket) {
    throw new Error("Missing required environment variable: DO_SPACES_BUCKET")
  }

  return bucket
}

export function getSpacesRegion() {
  const region = process.env.DO_SPACES_REGION

  if (!region) {
    throw new Error("Missing required environment variable: DO_SPACES_REGION")
  }

  return region
}

export function getSpacesCredentials() {
  const accessKeyId = process.env.DO_SPACES_KEY
  const secretAccessKey = process.env.DO_SPACES_SECRET

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing required environment variables: DO_SPACES_KEY and DO_SPACES_SECRET"
    )
  }

  return { accessKeyId, secretAccessKey }
}

export function getSpacesPublicEndpoint() {
  return getSpacesEndpoint()
}

export function getSpacesForcePathStyle() {
  return false
}