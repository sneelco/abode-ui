FROM fedora:latest

RUN dnf update -y
RUN dnf install -y httpd

RUN rm -f /etc/httpd/conf.d/{README,autoindex.conf,userdir.conf,welcome.conf}

COPY httpd.conf /etc/httpd/conf/
COPY src/ /var/www/html/

EXPOSE 80

ENTRYPOINT ["/usr/sbin/httpd"]
CMD ["-D", "FOREGROUND"]
