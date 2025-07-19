# StudyStack Backend API

A secure and scalable backend API for StudyStack, a resource-sharing platform for college students.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **File Upload**: Secure PDF upload with validation and size limits
- **Resource Management**: CRUD operations for educational resources
- **Search & Filtering**: Advanced search with pagination
- **Analytics**: User engagement and resource performance tracking
- **Security**: Rate limiting, input validation, and CORS protection

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Clerk.dev integration ready)
- **File Upload**: Multer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd studystack-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/studystack_db"
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

5. **Create upload directory**
   ```bash
   mkdir uploads
   ```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Public Endpoints

#### Get All Resources
```http
GET /api/resources
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 50)
- `subject` (string): Filter by subject
- `resourceType` (string): Filter by resource type
- `semester` (string): Filter by semester
- `search` (string): Search in title and description
- `sortBy` (string): Sort by newest, oldest, popular, downloads, title

**Response:**
```json
{
  "success": true,
  "data": {
    "resources": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Get Single Resource
```http
GET /api/resources/:id
```

### Protected Endpoints

#### Upload Resource
```http
POST /api/resources
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `file` (file): PDF file (max 10MB)
- `title` (string): Resource title (5-100 chars)
- `description` (string): Description (50-500 chars)
- `subject` (string): Subject category
- `resourceType` (string): PDF, DOC, DOCX, PPT, PPTX
- `semester` (string, optional): Semester
- `tags` (array, optional): Max 5 tags
- `isPrivate` (boolean, optional): Privacy setting
- `allowContact` (boolean, optional): Contact visibility

#### Get My Resources
```http
GET /api/my-resources
Authorization: Bearer <token>
```

#### Update Resource
```http
PUT /api/resources/:id
Authorization: Bearer <token>
```

#### Delete Resource
```http
DELETE /api/resources/:id
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
```

#### Login
```http
POST /api/auth/login
```

#### Get Profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### User Endpoints

#### Get User Statistics
```http
GET /api/users/stats
Authorization: Bearer <token>
```

#### Get Bookmarks
```http
GET /api/users/bookmarks
Authorization: Bearer <token>
```

#### Add Bookmark
```http
POST /api/users/bookmarks
Authorization: Bearer <token>
```

#### Get Analytics (Contributors only)
```http
GET /api/users/analytics
Authorization: Bearer <token>
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All inputs are validated and sanitized
- **File Validation**: Only PDF files up to 10MB allowed
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured for frontend domain
- **Helmet**: Security headers for Express
- **SQL Injection Protection**: Prisma ORM prevents SQL injection

## 📁 Project Structure

```
backend/
├── src/
│   ├── middleware/
│   │   ├── authMiddleware.js      # Authentication & authorization
│   │   ├── errorMiddleware.js     # Error handling
│   │   ├── uploadMiddleware.js    # File upload handling
│   │   └── validationMiddleware.js # Input validation
│   ├── routes/
│   │   ├── authRoutes.js          # Authentication routes
│   │   ├── resourceRoutes.js      # Resource management
│   │   └── userRoutes.js          # User-related routes
│   └── server.js                  # Main server file
├── prisma/
│   └── schema.prisma              # Database schema
├── uploads/                       # File storage directory
├── .env.example                   # Environment variables template
└── package.json
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📊 Database Schema

### Users
- `id`: Unique identifier
- `clerkId`: Clerk authentication ID
- `email`: User email (unique)
- `name`: Full name
- `role`: VIEWER, CONTRIBUTOR, ADMIN
- `institution`: Educational institution
- `bio`: User biography
- `phone`: Contact number
- `website`: Personal website
- `avatar`: Profile picture URL
- `isVerified`: Email verification status

### Resources
- `id`: Unique identifier
- `title`: Resource title
- `description`: Detailed description
- `fileName`: Original file name
- `filePath`: Server file path
- `fileSize`: File size in bytes
- `mimeType`: File MIME type
- `subject`: Academic subject
- `resourceType`: File type (PDF, DOC, etc.)
- `semester`: Academic semester
- `isPrivate`: Privacy setting
- `allowContact`: Contact visibility
- `views`: View count
- `downloads`: Download count
- `uploaderId`: Foreign key to Users

### Additional Tables
- `Tags`: Resource tags
- `ResourceTag`: Many-to-many relationship
- `Bookmarks`: User bookmarks
- `Activities`: User activity tracking

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_jwt_secret
CLERK_SECRET_KEY=your_clerk_secret_key
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@studystack.com or create an issue in the repository.