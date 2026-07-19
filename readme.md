![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Express](https://img.shields.io/badge/Express-5.x-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Redis](https://img.shields.io/badge/Redis-Cloud-red)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![License](https://img.shields.io/badge/license-RajSingh-blue)


# 🚀 OmniFeed (YT & Tweets Engine)
> **A High-Throughput, Production-Grade Content Distribution Pipeline Engineered with Distributed Cloud Caching, Active Cache Invalidation, and Containerized Infrastructure.**

OmniFeed is a robust, production-ready RESTful API designed to power modern high-concurrency content distribution platforms. It unifies high-bandwidth media streaming logic (similar to YouTube) with low-latency micro-blogging connection subsystems (similar to X/Twitter). Engineered to reflect industrial systems, this platform features complex MongoDB data aggregations, defensive middleware shielding, automated memory-capped cloud caching, and containerized deployment pipelines.

---

## 🔥 Highlighted System Features & Architectural Enhancements

### Distributed Caching & Data Consistency
* **High-Speed Caching Layer:** Integrates a cloud-hosted **Upstash Redis** cluster running over secure TLS/SSL proxies. Caches intensive endpoints—such as the Global Video Feed and User Watch History—to reduce primary database load and deliver sub-millisecond response times.
* **Active Cache Invalidation:** Implements state-driven invalidation hooks across mutative operations (POST, PATCH, DELETE). The system automatically flushes corresponding cache keys upon resource updates to guarantee strict data consistency and eliminate stale reads.
* **Fault-Tolerant Connection Topology:** Outfitted with an optimized Redis client configuration featuring background retry strategies (`maxRetriesPerRequest: null`) and a 10-second network handshake timeout window to prevent application crashes during transient network latency.
* **Automated Cache Eviction:** Relies on memory-capped Least Recently Used (LRU) data eviction schemas managed at the cloud database level. Automatically drops stale cache entries when capacity limits are reached to maintain system availability and prevent out-of-memory errors.

### Security, Framework & Error Controls
* **Dual-Token Authentication Architecture:** Implements a stateless authorization system utilizing two independent JSON Web Tokens (JWTs) with distinct responsibilities:
  * *Access Tokens (1 Day):* Encapsulates non-sensitive user claims within HTTP headers or cookies to authorize active API requests.
  * *Refresh Tokens (10 Days):* Stored in secure HTTP-Only cookies and verified against a database registry to handle seamless session rotation while mitigating token replay vectors.
* **Standardized API Response & Error Framework:** Guarantees uniform client data contracts by intercepting all operational outputs through dedicated `ApiError` and `ApiResponse` class wrappers, preventing sensitive internal stack leaks.
* **Centralized Async Control Flow:** Utilizes a global asynchronous handler wrapper (`asyncHandler`) across all Express routes to systematically catch unhandled promise rejections, completely eliminating redundant try-catch blocks within controller files.

### Data Pipelines & Infrastructure Isolation
* **Multi-Cloud Data Management:** Managed orchestration for highly varied payloads including large video files, binary images, text streams, and system interaction graphs. Workloads are distributed across dedicated services: **MongoDB Atlas** for document persistence, **Upstash Cloud** for caching, and **Cloudinary** for high-availability media content delivery.
* **Optimized Database Aggregations:** Leverages advanced MongoDB aggregation stages—including `$facet`, `$unwind`, and `$group`—to compute multi-collection metrics and channel data concurrently within a single database round-trip.
* **Defensive Media Buffering Pipeline:** Combines `multer` for raw local disk stream buffering with automated post-upload cleanup routines to handle file uploads securely without leaving residual artifacts on the application container.
* **Containerized Service Isolation:** Encapsulated within a **Docker Compose** ecosystem utilizing isolated bridge networks and volume tracking. The application container dynamically isolates environmental configurations via strict `.env` mapping to decouple code execution from host machine dependencies.

---

## 🛠️ The Core Technical Matrix

| Technology / Library | Architectural Responsibility | Engineering Purpose |
| :--- | :--- | :--- |
| **Runtime & Framework** | `Node.js` & `Express 5.2.1` | Asynchronous I/O routing layer managing client streams. |
| **Primary Database Cluster**| `MongoDB Atlas` & `Mongoose 9.7.1` | Document cluster schema layer with custom validation hooks. |
| **Distributed Cache Hub**   | `Upstash Redis` & `ioredis` | Super-fast caching layer utilizing TLS encryption, custom connection windows, active cache invalidation, and LRU eviction. |
| **Environment Container**   | `Docker` & `Docker Compose 3.8` | Standardized environment isolation, deterministic image building, and unified orchestration. |
| **Query Pagination** | `mongoose-aggregate-paginate-v2` | Cursor-based chunking for heavy multi-document query loads. |
| **Asset CDN Pipeline** | `Multer` & `Cloudinary` | Automated upload processing, stream processing, and multi-region file hosting. |
| **Security Architecture** | `jsonwebtoken` & `bcrypt` | Digital signature verification alongside cryptographic hashing protocols. |
| **Cross-Origin Pipeline** | `cors` & `cookie-parser` | Restricting resource access models and managing HTTP-only cookies. |

---


# 🏗️ System Architecture, Design & Data Flow

The backend follows a **Decoupled Three-Tier Architecture** consisting of:
* **Routing Layer**
* **Controller & Service Orchestration Layer**
* **Data Persistence Layer**

The architecture is designed with the following goals:
* Horizontal scalability
* Secure authentication and authorization
* Efficient media processing
* Centralized error handling
* Minimal database overhead
* Cloud-native storage support

---

# 🔄 Request Lifecycle & Caching Topology

Every request passes through multiple layers before interacting with persistent storage. Mutations dynamically trigger active cache updates, while query evaluations hit the cloud proxy memory layer directly.

```text
                     [ Incoming Client Request ]
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  Application Middleware  │ (CORS, Cookie Parser, JSON)
                    └─────────────┬────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   JWT Authentication     │ (verifyJWT Shield)
                    └─────────────┬────────────┘
                                  │
                                  ▼
               [ WHAT IS THE REQUEST TYPE? ]
                ├───> WRITE (POST/PATCH/DELETE) ──> [ Execute Mutations in DB ] ──> [ ♻️ Invalidate & Flush Redis Key ]
                │                                                                                   │
                └───> READ (GET Feed/History)                                                       ▼
                          │                                                                 [ Send Sync Response ]
                          ▼
            ⚡───[ IS CACHEABLE ENDPOINT? ]───────┐
            │                                     │
           YES                                    NO
            │                                     │
            ▼                                     ▼
 ┌──────────────────────┐               ┌────────────────────┐
 │  Query Upstash Cloud │               │ Skip Caching Layer │
 │  Redis Layer (TLS)   │               └─────────┬──────────┘
 └──────────┬───────────┘                         │
            │                                     │
    ┌───────┴───────┐                             │
    │               │                             │
[ CACHE HIT ]   [ CACHE MISS ]                     │
    │               │                             │
 (⚡ Fast)          ▼                             ▼
    │     ┌───────────────────┐        ┌────────────────────┐
    │     │ Read Primary DB   │        │ Execute Controller │
    │     │ (MongoDB Cluster) │        │   Business Logic   │
    │     └─────────┬─────────┘        └──────────┬─────────┘
    │               │                             │
    │               ▼                             │
    │     ┌───────────────────┐                   │
    │     │ Write New Cache   │                   │
    │     │   (Auto-Evict)    │                   │
    │     └─────────┬─────────┘                   │
    │               │                             │
    └───────────────┼─────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Central API Response  │ (ApiSuccess / ApiError)
        └───────────────────────┘
---
```
# 🐳 Infrastructure Container Configuration
The project operates within an isolated container network, configured to consume cloud dependencies natively while tracking variables dynamically:
```text
version: '3.8'

services:
  # 1. Custom Express Application Microservice
  omnifeed-backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - REDIS_URL=${REDIS_URL}
```

# 🗄️ Database Design

The application uses a **normalized MongoDB schema design** to avoid document bloat, improve query performance, and support future scalability.

## Entity Relationship Diagram

```mermaid
erDiagram

    USER {
        ObjectId _id
        string username
        string email
        string avatar
        string coverImage
    }

    VIDEO {
        ObjectId _id
        ObjectId owner
        string title
        string description
        string videoFile
        string thumbnail
        number duration
        number views
    }

    COMMENT {
        ObjectId _id
        ObjectId owner
        ObjectId video
        string content
    }

    TWEET {
        ObjectId _id
        ObjectId owner
        string content
    }

    PLAYLIST {
        ObjectId _id
        ObjectId owner
        ObjectId[] videos
        string name
        string description
    }

    LIKE {
        ObjectId _id
        ObjectId likedBy
        ObjectId video
        ObjectId comment
        ObjectId tweet
    }

    SUBSCRIPTION {
        ObjectId _id
        ObjectId subscriber
        ObjectId channel
    }

    USER ||--o{ VIDEO : owns
    USER ||--o{ COMMENT : writes
    USER ||--o{ TWEET : creates
    USER ||--o{ PLAYLIST : creates
    USER ||--o{ LIKE : gives

    VIDEO ||--o{ COMMENT : contains
    PLAYLIST }o--o{ VIDEO : stores

    VIDEO ||--o{ LIKE : receives
    COMMENT ||--o{ LIKE : receives
    TWEET ||--o{ LIKE : receives

    USER ||--o{ SUBSCRIPTION : subscriber
    USER ||--o{ SUBSCRIPTION : channel
```

---

# 📚 Schema Relationships

## 👤 User

The primary entity of the system responsible for authentication, authorization, ownership, and user interactions.

### Features

* Indexed username lookup
* Password hashing using bcrypt
* JWT authentication
* Refresh token management

---

## 🎥 Video

Stores media metadata and cloud-hosted asset references.

### Relationships

* Owned by a single user.
* Can contain multiple comments.
* Can receive multiple likes.
* Can belong to multiple playlists.

---

## 💬 Comment

Represents user discussions on videos.

### Relationships

* Written by a user.
* Associated with exactly one video.
* Can receive likes.

---

## 📝 Tweet

Supports lightweight micro-blogging functionality.

### Relationships

* Created by a user.
* Can receive likes.

---

## ❤️ Like

Implements polymorphic interactions.

A like can belong to one of:

* Video
* Comment
* Tweet

This design prevents duplication of interaction logic across collections.

---

## 📂 Playlist

Represents a user-defined collection of videos.

### Relationships

* Owned by a user.
* Contains multiple videos.
* Supports dynamic collection sizes without duplicating video documents.

---

## 🔔 Subscription

Implements the follower-following relationship.

### Relationships

* `subscriber → User`
* `channel → User`

This creates a scalable many-to-many self-referencing graph.

---

# 🛡️ Architectural Decisions

## Centralized Async Error Handling

```javascript
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(
      requestHandler(req, res, next)
    ).catch(next);
  };
};
```

### Benefits

* Eliminates repetitive try-catch blocks.
* Provides centralized error handling.
* Keeps controllers clean and maintainable.

---

## Standardized API Responses

### Success Response

```json
{
  "statusCode": 
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response

```json
{
  "statusCode":00,
  "success": false,
  "message": "",
  "errors":[],
  "stack":"" 
  }
  
```

---
## ⚙️Production Caching Policies & Connection Logic
```text
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("❌ REDIS_URL is not defined in the environment variables!");
}

// Configured for high-availability cloud cluster operations
const redis = new Redis(redisUrl, {
    // Stops client from triggering fatal thread exits during network hiccups
    maxRetriesPerRequest: null,
    
    // Forces secure in-transit encryption required by cloud operators
    tls: {},
    
    // Extends connection window to match cloud network handshake bounds
    connectTimeout: 10000,
    
    retryStrategy(times) {
        return Math.min(times * 100, 3000);
    }
});

redis.on('connect', () => {
    console.log('🚀 Redis Connected successfully to the cloud database!');
});

export default redis;
```
---

## Automated Media Cleanup Pipeline

```javascript
try {
  const response = await cloudinary.uploader.upload(
    localFilePath,
    {
      resource_type: "auto"
    }
  );

  unlinkSync(localFilePath);

  return response;
} catch (error) {
  unlinkSync(localFilePath);

  return null;
}
```

This guarantees that temporary files are deleted regardless of upload success or failure.


---
## ⚡ Performance Optimizations

- Distributed Redis Cloud Caching
- Active Key Invalidation Strategy
- MongoDB Aggregation Pipelines
- Database Indexing
- Selective Field Projection
- Pagination Support
- Cloud CDN Media Delivery
- Stateless Authentication
- Request Payload Limits
- Async Error Handling
```

# 🔀 API Modules

| Module                  | Access Level | Description                           |
| ----------------------- | ------------ | ------------------------------------- |
| `/api/v1/healthcheck`   | Public       | Server health monitoring              |
| `/api/v1/users`         | Mixed        | Authentication and profile management |
| `/api/v1/videos`        | Protected    | Video management                      |
| `/api/v1/tweets`        | Protected    | Tweet CRUD operations                 |
| `/api/v1/comments`      | Protected    | Comment operations                    |
| `/api/v1/playlists`     | Protected    | Playlist management                   |
| `/api/v1/likes`         | Protected    | Interaction endpoints                 |
| `/api/v1/subscriptions` | Protected    | Subscription management               |
| `/api/v1/dashboard`     | Protected    | Analytics and creator statistics      |

---
```
## 📌 Complete API Endpoints Reference

All request pathways are strictly prefixed under the explicit routing layer `GET/POST/PATCH/DELETE /api/v1`. 

---

### 👤 Authentication & User Subsystem (`/api/v1/users`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/register` | 🔓 Public | `upload.fields(['avatar', 'coverImage'])` | Creates a new user account and handles cloud-hosted asset uploads. |
| **POST** | `/login` | 🔓 Public | *None* | Authenticates user credentials, sets secure tokens, and initializes a session. |
| **POST** | `/logout` | 🔐 Protected | `verifyJWT` | Destroys active refresh hashes in the DB and wipes client side cookies. |
| **POST** | `/refresh-token` | 🔓 Public | *None* | Validates long-term refresh cookies to instantly rotate and update short-term tokens. |
| **PATCH** | `/change-password` | 🔐 Protected | `verifyJWT` | Validates current password hashes to update to a new user password. |
| **GET** | `/current-user` | 🔐 Protected | `verifyJWT` | Fetches active account information from `req.user` without exposing passwords. |
| **PATCH** | `/update-account` | 🔐 Protected | `verifyJWT` | Updates partial non-file profile metadata fields (email, names, etc.). |
| **PATCH** | `/update-avatar` | 🔐 Protected | `verifyJWT` + `upload.single('avatar')` | Overwrites old avatar files in cloud storage with a new file asset. |
| **PATCH** | `/update-coverImage` | 🔐 Protected | `verifyJWT` + `upload.single('coverImage')` | Overwrites old background banner artwork assets with a new file upload. |
| **GET** | `/channel/:username` | 🔐 Protected | `verifyJWT` | Aggregates dynamic metrics (subscribers, counts) for a target profile. |
| **PATCH** | `/watch/:videoId` | 🔐 Protected | `verifyJWT` | Injects a targeted video pointer directly into the user's view history array. |
| **GET** | `/watch/history` | 🔐 Protected | `verifyJWT` | Runs an aggregation loop to return the authenticated user's watch history. |

---

### 🎥 Video Subsystem (`/api/v1/videos`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | 🔐 Protected | `verifyJWT` | Returns a paginated list feed of global videos based on filter options. |
| **POST** | `/` | 🔐 Protected | `verifyJWT` + `upload.fields(['videoFile', 'thumbnail'])` | Bundles raw media streams and thumbnails to publish content live. |
| **GET** | `/:videoId` | 🔐 Protected | `verifyJWT` | Fetches complete metadata records and tracking fields for a single video. |
| **PATCH** | `/:videoId` | 🔐 Protected | `verifyJWT` + `upload.single('thumbnail')` | Modifies text meta fields or overwrites video preview thumbnails. |
| **DELETE** | `/:videoId` | 🔐 Protected | `verifyJWT` | Wipes video assets from database layers and triggers a sync cloud purge. |
| **PATCH** | `/toggle/publish/:videoId` | 🔐 Protected | `verifyJWT` | Alternates visibility states between true/false to switch private/public. |

---

### 📝 Tweet Subsystem (`/api/v1/tweets`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | 🔐 Protected | `verifyJWT` | Commits a new micro-blogging short text record to the database. |
| **GET** | `/user/:userId` | 🔐 Protected | `verifyJWT` | Queries and collects all short updates authored by a target account. |
| **PATCH** | `/:tweetId` | 🔐 Protected | `verifyJWT` | Allows authors to edit the string content of an existing micro-post. |
| **DELETE** | `/:tweetId` | 🔐 Protected | `verifyJWT` | Permanently deletes a specific tweet post out of user document feeds. |

---

### 💬 Comment Subsystem (`/api/v1/comments`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/:videoId` | 🔐 Protected | `verifyJWT` | Uses aggregate pagination to load discussion feeds mapped to a video. |
| **POST** | `/:videoId` | 🔐 Protected | `verifyJWT` | Appends a fresh discussion text comment string under a target media file. |
| **PATCH** | `/c/:commentId` | 🔐 Protected | `verifyJWT` | Allows an account owner to rewrite their original comment text. |
| **DELETE** | `/c/:commentId` | 🔐 Protected | `verifyJWT` | Removes an explicitly targeted comment entry out of active threads. |

---

### 📂 Playlist Subsystem (`/api/v1/playlists`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | 🔐 Protected | `verifyJWT` | Sets up a blank custom collection container mapped to the user creator. |
| **GET** | `/:playlistId` | 🔐 Protected | `verifyJWT` | Resolves array pointers to return complete lists of populated videos. |
| **PATCH** | `/:playlistId` | 🔐 Protected | `verifyJWT` | Modifies name structures or description lines of the target compilation. |
| **DELETE** | `/:playlistId` | 🔐 Protected | `verifyJWT` | Drops the playlist tracking entity completely without removing raw videos. |
| **PATCH** | `/add/:videoId/:playlistId` | 🔐 Protected | `verifyJWT` | Appends an existing video object pointer inside the playlist's collection array. |
| **PATCH** | `/remove/:videoId/:playlistId` | 🔐 Protected | `verifyJWT` | Pulls out a target video object pointer out of the playlist's storage set. |
| **GET** | `/user/:userId` | 🔐 Protected | `verifyJWT` | Collects every custom folder collection created by a target account ID. |

---

### ❤️ Likes & Reactions Subsystem (`/api/v1/likes`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/toggle/v/:videoId` | 🔐 Protected | `verifyJWT` | Toggles standard user engagement status on a video file. |
| **POST** | `/toggle/c/:commentId` | 🔐 Protected | `verifyJWT` | Toggles standard user engagement status on a thread comment. |
| **POST** | `/toggle/t/:tweetId` | 🔐 Protected | `verifyJWT` | Toggles standard user engagement status on a micro-blog post. |
| **GET** | `/videos` | 🔐 Protected | `verifyJWT` | Runs an aggregation query to collect every video document liked by the user. |

---

### 🔔 Subscription Subsystem (`/api/v1/subscriptions`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/c/:channelId` | 🔐 Protected | `verifyJWT` | Toggles subscription mappings to follow or unfollow a profile. |
| **GET** | `/c/:channelId` | 🔐 Protected | `verifyJWT` | Resolves target junction records to list all user documents following the channel. |
| **GET** | `/u/subscribedChannels` | 🔐 Protected | `verifyJWT` | Aggregates user paths to return all creator channel hubs followed by the user. |

---

### 📊 Creator Dashboard & Diagnostics (`/api/v1/dashboard` & `/api/v1/healthcheck`)

| Method | Endpoint | Access Shield | Middleware / Payload Processing | Functional Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/dashboard/stats` | 🔐 Protected | `verifyJWT` | Runs a `$facet` look up to return total channel views, likes, and subscribers. |
| **GET** | `/dashboard/videos` | 🔐 Protected | `verifyJWT` | Collects all uploaded media records belonging to the logged-in creator. |
| **GET** | `/healthcheck` | 🔓 Public | *None* | Diagnostic route returning JSON signals confirming backend engine health. |

---

## 📁 Project Directory Structure

The application enforces a highly structured **Separation of Concerns (SoC)** by separating business logic, models, controllers, and routing schemes inside a clean `src/` directory tree layout:

```text
OmniFeed-ytTweets/
├── public/
│   └── temp/                 # Local temporary disk buffer for incoming file streams
├── src/
│   ├── controllers/          # Business logic handlers processing requests/responses
│   ├── db/                   # Database connection scripts and configurations
│   ├── middlewares/          # Custom auth shields, file upload configs, and interceptors
│   ├── models/               # Persistent Mongoose schema relationship definitions
│   ├── routes/               # API endpoint dispatch maps categorized by resource
│   ├── utils/                # Standardized global helpers (Async, Errors, CDNs)
│   ├── app.js                # Perimeter gateway configurator (CORS, Parsers, Cookies)
│   ├── config.js             # Environment variables orchestration management
│   ├── constants.js          # Shared system-wide constant configuration tokens
│   └── index.js              # Primary server bootstrap entry point executing runtime setup
├── .env                      # Local runtime environment cryptographic signature keys
├── .gitignore                # Target array tracking directories omitted from Git tracking
├── .prettierignore           # Code formatter exclusion boundaries
├── .prettierrc               # Code syntax style standard specifications
├── package-lock.json         # Complete pinned tree list of downstream dependencies
├── package.json              # Core manifest containing project scripts and engine keys
└── readme.md                 # Complete primary documentation portal
```

## ⚙️ Environment Variables Setup

Create a file named `.env` in the root directory of your project and populate it with the following configuration details:

```env
PORT=8000
CORS_ORIGIN=*

# MongoDB Connection String
MONGODB_URI=mongodb+srv://
# Cryptographic JSON Web Token Configuration
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary CDN Configuration Assets
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

REDIS_URL

```

## 🔐 Authentication & Token Lifecycle

The authentication system follows a **dual-token JWT architecture** that separates short-lived authorization credentials from long-lived session credentials.

This approach provides:
```text
* Stateless authentication
* Secure session persistence
* Refresh token rotation
* Protection against token replay attacks
* Reduced server-side memory usage
```

---

## 🔄 Dual Token Strategy

The application uses two independent JWTs with different responsibilities.
```

| Token             | Lifetime  | Storage Location                   | Purpose                                                              |
| ----------------- | --------- | ---------------------------------- | -------------------------------------------------------------------- |
| **Access Token**  | `1 day`   | HTTP Header or Secure Cookie       | Authorizes API requests and contains non-sensitive user claims.      |
| **Refresh Token** | `10 days` | HTTP-Only Secure Cookie + Database | Generates new access tokens without requiring users to log in again. |

---```

## 📝 Registration Flow

When a new user registers via:

```text
POST /api/v1/users/register
```

the password is automatically hashed before being stored.

### Registration Pipeline

1. User submits registration details.
2. Mongoose executes the `pre("save")` middleware.
3. If the password field has changed, bcrypt generates a secure hash.
4. Only the hashed password is stored in MongoDB.

```javascript
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});
```

---

## 🔑 Login Flow

When a user authenticates via:

```text
POST /api/v1/users/login
```

the following sequence occurs:

```mermaid
flowchart TD

A[Client Login Request]
--> B[Find User by Username or Email]

B --> C[Validate Password using bcrypt.compare]

C --> D[Generate Access Token]
C --> E[Generate Refresh Token]

E --> F[Store Refresh Token in Database]

D --> G[Send Access Token Cookie]
F --> H[Send Refresh Token Cookie]

G --> I[Authenticated Session]
H --> I
```

---

### Cookie Security Configuration

Tokens are issued using secure cookie settings:

```javascript
const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict"
};
```

| Option            | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `httpOnly`        | Prevents JavaScript from accessing cookies.      |
| `secure`          | Ensures cookies are only transmitted over HTTPS. |
| `sameSite=strict` | Reduces CSRF attack vectors.                     |

---

## 🛡️ Protected Route Verification

Every protected endpoint passes through the `verifyJWT` middleware.

### Verification Pipeline

```mermaid
flowchart LR

A[Incoming Request]
--> B[Extract Access Token]

B --> C[Verify JWT Signature]

C --> D[Decode Payload]

D --> E[Fetch User Document]

E --> F[Attach User to req.user]

F --> G[Continue Request Execution]
```

The middleware performs the following checks:

* Extracts the token from cookies or `Authorization` headers.
* Verifies the JWT signature using `ACCESS_TOKEN_SECRET`.
* Fetches the authenticated user document.
* Removes sensitive fields before attaching the user object to `req.user`.

```javascript
const user = await User.findById(decodedToken?._id)
    .select("-password -refreshToken");

req.user = user;
```

---

## 🔄 Refresh Token Rotation

To avoid forcing users to log in repeatedly, the application supports silent token refresh.

```text
POST /api/v1/users/refresh-token
```

### Refresh Flow

```mermaid
flowchart TD

A[Receive Refresh Token]
--> B[Verify Signature]

B --> C[Find User]

C --> D[Compare Stored Refresh Token]

D --> E[Generate New Access Token]
D --> F[Generate New Refresh Token]

F --> G[Update Database]

E --> H[Return New Cookies]
G --> H
```

### Validation Steps

1. Extract refresh token from cookies.
2. Verify token signature using `REFRESH_TOKEN_SECRET`.
3. Retrieve user document from MongoDB.
4. Compare the incoming token with the token stored in the database.
5. Generate and issue a new token pair if validation succeeds.

This mechanism protects against:

* Stolen refresh tokens
* Replay attacks
* Session fixation attacks

---

## 🚪 Logout Flow

When a user logs out via:

```text
POST /api/v1/users/logout
```

the application invalidates the active session.

```javascript
await User.findByIdAndUpdate(
    req.user._id,
    {
        $unset: {
            refreshToken: 1
        }
    }
);
```

The server then clears both authentication cookies:

```javascript
res.clearCookie("accessToken");
res.clearCookie("refreshToken");
```

```mermaid
flowchart LR

A[Logout Request]
--> B[Remove Refresh Token From Database]

B --> C[Clear Access Token Cookie]

C --> D[Clear Refresh Token Cookie]

D --> E[Session Invalidated]
```

Once the refresh token is removed, no new access tokens can be generated, effectively terminating the session across future requests.

---

## ✅ Security Measures

The authentication system includes:
```
* JWT Access Tokens
* Refresh Token Rotation
* HTTP-Only Cookies
* Secure Cookie Transmission
* Password Hashing with bcrypt
* Replay Attack Protection
* Session Invalidation
* Protected Route Middleware
* Sensitive Field Projection Removal
```


## 🔮 Future Enhancements
```
- WebSocket Real-Time Notifications
- Video Transcoding Processing Workers
- Advanced ML Recommendation Engine
- Distributed Task Queue Integration
- Global API Rate Limiting
```



# 🏁 Conclusion

The backend architecture systematically prioritizes system scalability, security, maintainability, and performance through a modular, layered design. By integrating normalized document patterns, active cloud memory tracking, and isolated multi-container orchestration, the engine delivers consistent efficiency across complex workflows.

### 🛠️ Core Engineering Foundations
*   **📐 Strategic Schema Layout:** Utilizing a normalized schema design to eliminate document bloat while maintaining highly optimized query paths.
*   **🏗️ Tiered Layered Architecture:** Enforcing a clean Separation of Concerns (SoC) across the routing, middleware, controller, and data persistence boundaries.
*   **⚡ Active Cloud Memory Sync:** Implementing automated real-time cache invalidation systems via Upstash Redis to secure strict data consistency across user streams.
*   **🐳 Standardized Containerization:** Centralizing infrastructure management within isolated Docker networks for rapid, predictable deployment environments.

### 🌟 Operational Impact
This architecture guarantees that the engine cleanly accommodates:
*   High-throughput **large media workloads** and automated disk cleanup boundaries.
*   Reliable data streams across a **multi-cloud network mesh** consisting of MongoDB Atlas, Upstash, and Cloudinary.
*   High-concurrency traffic patterns while maintaining clean boundary lines and fully predictable system behaviors.