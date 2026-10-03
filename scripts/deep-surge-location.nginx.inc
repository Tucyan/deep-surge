# Include inside taskstream.xyz HTTPS server block.
location = /deep-surge { return 308 /deep-surge/; }
location ^~ /deep-surge/ {
    proxy_pass http://127.0.0.1:3183;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
