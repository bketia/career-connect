# CareerConnect

CareerConnect is a web application that helps students, graduates and job seekers find jobs and internships in Rwanda and around the world. It loads live job listings from the Jobs Every Hour API and lets users search, filter, sort and save opportunities in one place.

- **Live site (through the load balancer):** https://www.bezastudio.tech
- **Demo video:** [ADD VIDEO LINK HERE]
- **GitHub repository:** https://github.com/bketia/career-connect

## API Keys and Credentials

**No API key, account or login is required.** The Jobs Every Hour API is a free public API that does not use authentication, and CareerConnect has no user accounts. Anyone can open the live site and use every feature right away.

## Why CareerConnect?

Students and recent graduates often check many different websites to find openings. CareerConnect brings up-to-date listings into one simple page, so users can quickly search for a role, narrow the results down by location or category, and save the jobs they want to come back to.

## Features

- **Live job listings** loaded from the Jobs Every Hour API
- **Search** by job title, company or location
- **Location filter:** All Locations, Rwanda, Remote or International
- **Category filter:** built automatically from the categories in the API data (for example Engineering, Security, Data & Research)
- **Sorting:** Newest First or Company Name
- **Job count** showing how many opportunities match the current search and filters
- **Saved jobs:** save opportunities and remove them later. Saved jobs are stored in the browser with `localStorage`, so they stay after the page is closed.
- **Job details** on each card: title, company, category, location (with a Remote label), salary, date posted and a link to the original listing
- **Caching:** API results are stored in the browser for one hour to make the page faster and to respect the API's fair-use guidance
- **Error handling:** clear messages when the API is unavailable or returns unexpected data, with a fallback to previously saved results

## API Used

### Jobs Every Hour API

- **Documentation:** https://jobseveryhour.com/api/
- **Website:** https://jobseveryhour.com/
- **Endpoint used:** `GET https://jobseveryhour.com/api/v1/latest.json`
- **Authentication:** none (no API key or sign-up needed)
- **Data refresh:** the API collects jobs from employers' career pages and updates them every hour
- **Fair use:** the documentation asks developers to request each feed no more than once an hour. CareerConnect caches the results for exactly one hour to follow this.
- **Results:** the latest feed returns the 30 newest jobs, so some filters (for example Rwanda) may show few or no results at a given time

Each job returned by the API includes `title`, `category`, `company`, `location`, `remote`, `salary`, `posted` and `url`.

### cors.dev proxy

- **Website:** https://proxy.cors.dev/
- The API is requested through the cors.dev proxy (`https://proxy.cors.dev/https://jobseveryhour.com/api/v1/latest.json`) so that the browser can load the data without being blocked by CORS (Cross-Origin Resource Sharing) rules.

## Technologies Used

- **HTML5:** page structure
- **CSS3:** layout and styling
- **JavaScript (vanilla):** Fetch API, `localStorage`, DOM manipulation
- **Nginx:** web server on web-01 and web-02
- **HAProxy:** load balancer on lb-01
- **Let's Encrypt / Certbot:** free SSL certificate for HTTPS
- **Git and GitHub:** version control and deployment

## Project Structure

```
career-connect/
├── index.html      # Page structure: navigation, search, filters, job list, saved jobs
├── css/
│   └── style.css   # Styling for the whole site
├── js/
│   └── app.js      # API requests, caching, search, filters, sorting, saved jobs
├── .gitignore      # Files that should not be uploaded to GitHub
└── README.md
```

## Running the Application Locally

**Requirements:** a web browser and an internet connection. Python 3 is optional, for running a local server.

1. Clone the repository:

   ```bash
   git clone https://github.com/bketia/career-connect.git
   cd career-connect
   ```

2. Start a simple local web server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and go to:

   ```
   http://localhost:8000
   ```

You can also open `index.html` directly in the browser by double-clicking it. No installation or build step is needed.

## Deployment

The application is deployed on three servers. Users visit the load balancer, which shares the traffic between the two web servers.

| Server | Hostname | IP Address | Role |
| ------ | -------- | ---------- | ---- |
| Web01 | 7108-web-01 | 18.175.244.187 | Nginx web server hosting CareerConnect |
| Web02 | 7108-web-02 | 3.8.123.78 | Nginx web server hosting CareerConnect |
| Lb01 | 7108-lb-01 | 35.176.241.5 | HAProxy load balancer with HTTPS |

```
                     Users
                       |
          https://www.bezastudio.tech
                       |
            Lb01 (HAProxy, port 443)
             SSL termination + roundrobin
              /                      \
   Web01 (Nginx, port 80)    Web02 (Nginx, port 80)
   /var/www/careerconnect    /var/www/careerconnect
```

### Step 1: Connect to the servers

The servers were accessed with SSH using a private key. To make this easier, these shortcuts were added to `~/.ssh/config`:

```
Host web01
    HostName 18.175.244.187
    User ubuntu
    IdentityFile ~/.ssh/school

Host web02
    HostName 3.8.123.78
    User ubuntu
    IdentityFile ~/.ssh/school

Host lb01
    HostName 35.176.241.5
    User ubuntu
    IdentityFile ~/.ssh/school
```

After this, each server can be reached with `ssh web01`, `ssh web02` or `ssh lb01`.

### Step 2: Deploy the application on Web01 and Web02

The same steps were run on **both** web servers. Nginx was already installed from an earlier project.

1. Install Git:

   ```bash
   sudo apt-get update
   sudo apt-get install -y git
   ```

2. Clone the repository into the web folder:

   ```bash
   sudo git clone https://github.com/bketia/career-connect.git /var/www/careerconnect
   ```

3. Point Nginx to the application folder by changing the `root` line in `/etc/nginx/sites-available/default`:

   ```bash
   sudo sed -i "s#root /var/www/html;#root /var/www/careerconnect;#" /etc/nginx/sites-available/default
   ```

4. Check the configuration and restart Nginx:

   ```bash
   sudo nginx -t
   sudo service nginx restart
   ```

The Nginx server block on each web server looks like this:

```nginx
server {
    listen 80 default_server;

    root /var/www/careerconnect;
    index index.html index.htm;
    server_name _;

    add_header X-Served-By $hostname always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

The `X-Served-By` header contains the server's hostname (`7108-web-01` or `7108-web-02`), which shows which server answered each request. This is used to check that the load balancer is working.

### Step 3: Configure the load balancer on Lb01

HAProxy was installed on Lb01 and configured in `/etc/haproxy/haproxy.cfg`.

1. Install HAProxy and Certbot:

   ```bash
   sudo apt-get update
   sudo apt-get install -y haproxy certbot
   ```

2. Get a free SSL certificate for the domain from Let's Encrypt. HAProxy is stopped briefly so Certbot can use port 80, then the certificate and key are combined into one file for HAProxy:

   ```bash
   sudo service haproxy stop
   sudo certbot certonly --standalone -d www.bezastudio.tech
   sudo mkdir -p /etc/haproxy/certs
   sudo bash -c "cat /etc/letsencrypt/live/www.bezastudio.tech/fullchain.pem /etc/letsencrypt/live/www.bezastudio.tech/privkey.pem > /etc/haproxy/certs/www.bezastudio.tech.pem"
   ```

3. Configure HAProxy. The main parts of the configuration are:

   ```
   frontend http_front
       bind *:80
       http-request set-header X-Forwarded-Proto http
       redirect scheme https code 301 if !{ ssl_fc }
       default_backend http_back

   frontend https_front
       bind *:443 ssl crt /etc/haproxy/certs/www.bezastudio.tech.pem alpn http/1.1
       http-request set-header X-Forwarded-Proto https
       default_backend http_back

   backend http_back
       balance roundrobin
       server 7108-web-01 18.175.244.187:80 check
       server 7108-web-02 3.8.123.78:80 check
   ```

   - **`http_front`** listens on port 80 and redirects all HTTP visitors to HTTPS with a `301` redirect.
   - **`https_front`** listens on port 443, decrypts the HTTPS traffic (SSL termination) and passes it to the web servers.
   - **`http_back`** sends requests to Web01 and Web02 in turn using the **roundrobin** algorithm. The `check` option means HAProxy regularly checks each server and stops sending traffic to a server that is down.

4. Check the configuration and start HAProxy:

   ```bash
   sudo haproxy -c -f /etc/haproxy/haproxy.cfg
   sudo service haproxy restart
   ```

### Step 4: Domain name

DNS A records were added for the domain `bezastudio.tech`:

| Host | Points to |
| ---- | --------- |
| `www` | 35.176.241.5 (Lb01) |
| `lb-01` | 35.176.241.5 (Lb01) |
| `web-01` | 18.175.244.187 (Web01) |
| `web-02` | 3.8.123.78 (Web02) |

### Step 5: Testing the deployment

1. Each web server serves the application directly:

   ```bash
   curl -s 18.175.244.187 | grep "<title>"
   curl -s 3.8.123.78 | grep "<title>"
   ```

   Output from both:

   ```
   <title>CareerConnect | Find Your Next Opportunity</title>
   ```

2. The load balancer shares the traffic between the two servers:

   ```bash
   for i in 1 2 3 4; do curl -sI https://www.bezastudio.tech | grep X-Served-By; done
   ```

   Output:

   ```
   X-Served-By: 7108-web-01
   X-Served-By: 7108-web-02
   X-Served-By: 7108-web-01
   X-Served-By: 7108-web-02
   ```

   The responses alternate between the two servers, which shows the roundrobin load balancing is working.

3. HTTP is redirected to HTTPS:

   ```bash
   curl -sI http://www.bezastudio.tech | head -1
   ```

   Output:

   ```
   HTTP/1.1 301 Moved Permanently
   ```

4. In the browser, https://www.bezastudio.tech loads the application, jobs appear, and search, filters, sorting and saved jobs all work the same way whichever server answers.

### Step 6: Updating the deployment

After pushing new changes to GitHub, both web servers are updated with:

```bash
for s in web01 web02; do ssh $s 'cd /var/www/careerconnect && sudo git pull'; done
```

Because the site is made of static files, no restart is needed after an update.

## Error Handling

- While the jobs are loading, the page shows **"Loading job opportunities..."**.
- If the API request fails or returns an error status, the app shows a clear message instead of a broken page: **"Sorry, we could not load job opportunities. Please try again later."**
- If the API returns data in an unexpected format, it is treated as an error and handled the same way.
- If the API is down but jobs were loaded earlier, the app falls back to the saved results so users can still browse.
- If no jobs match the search and filters, the page shows **"No jobs found. Try changing your search or filters."**
- If saved data in the browser is damaged, the app ignores it instead of crashing.

## Security

- **No secrets in the code:** the API needs no key, so there are no API keys or passwords in the repository. A `.gitignore` file is included to keep files such as `.env` out of GitHub.
- **Protection against XSS (cross-site scripting):** all data from the API is added to the page with `textContent` instead of `innerHTML`, so any HTML or scripts in the data are shown as plain text and never run.
- **Safe links:** only secure `https://` job links are shown. Links open in a new tab with `rel="noopener noreferrer"`.
- **HTTPS:** the live site is served over HTTPS, and plain HTTP traffic is redirected to HTTPS.

## Challenges and Solutions

1. **CORS restrictions.** The browser blocked direct requests to the API from the website. I solved this by sending the requests through the cors.dev proxy, which adds the headers the browser needs.

2. **Filters that did not match the API data.** My first version had a "Job Type" filter (Internship, Full-time and so on), but after checking the real API response, I found that the API does not include a job type field, so the filter always showed zero results. I replaced it with a **Category filter** that uses the API's real `category` field and builds its options automatically from the data.

3. **API reliability and fair use.** To avoid making too many requests and to keep the site working when the API is slow or unavailable, I cache the results in `localStorage` for one hour, which also follows the API's request to fetch each feed no more than once an hour. If a request fails, the app uses the cached results.

4. **Saved jobs not updating.** At first, the Saved Jobs section only updated after reloading the page. I fixed this by refreshing the saved jobs list every time a job is saved or removed.

5. **Load balancer header capitalisation.** HAProxy 2.x changes header names to lowercase, so the `X-Served-By` header appeared as `x-served-by`. I configured HAProxy to keep its original capitalisation so the testing output is clear.


## Credits

- **[Jobs Every Hour](https://jobseveryhour.com/)** for the free job listings API ([API documentation](https://jobseveryhour.com/api/)). All job data belongs to Jobs Every Hour and the employers who posted the jobs, and every job card links back to its original listing.
- **[cors.dev](https://proxy.cors.dev/)** for the CORS proxy service.
- **[Let's Encrypt](https://letsencrypt.org/)** and **[Certbot](https://certbot.eff.org/)** for the free SSL certificate.
- **[Nginx](https://nginx.org/)** and **[HAProxy](https://www.haproxy.org/)** for the web server and load balancer software.
- **[MDN Web Docs](https://developer.mozilla.org/)** for documentation on the Fetch API, `localStorage` and DOM manipulation.

## Author

**Beza Ketia**

- GitHub: [@bketia](https://github.com/bketia)