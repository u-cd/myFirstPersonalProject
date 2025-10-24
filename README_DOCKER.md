# Running myFirstPersonalProject with Docker

This file shows quick commands to build and run the Express app using Docker.

Build the image locally:

```powershell
docker build -t myfirstpersonalproject .
```

Run the container (map port 3000):

```powershell
docker run --rm -p 3000:3000 myfirstpersonalproject
```

Or use docker-compose to build and run:

```powershell
docker compose up --build
```

Then open http://localhost:3000 to see the JSON response from the Express app.
