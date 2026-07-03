const LOCAL_PUBLIC_ENDPOINT = "http://localhost:9000"

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
  const endpoint = getSpacesEndpoint()

  if ((!accessKeyId || !secretAccessKey) && isLocalSpacesEndpoint(endpoint)) {
    return {
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    }
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing required environment variables: DO_SPACES_KEY and DO_SPACES_SECRET"
    )
  }

  return { accessKeyId, secretAccessKey }
}

export function isLocalSpacesEndpoint(endpoint: string) {
  return endpoint.includes("minio") || endpoint.includes("localhost")
}

export function getSpacesPublicEndpoint() {
  const endpoint = getSpacesEndpoint()

  if (isLocalSpacesEndpoint(endpoint)) {
    return LOCAL_PUBLIC_ENDPOINT
  }

  return endpoint
}

export function getSpacesForcePathStyle() {
  const endpoint = getSpacesEndpoint()
  return isLocalSpacesEndpoint(endpoint)
}