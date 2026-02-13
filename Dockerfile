# ベースイメージ
FROM php:8.2-apache

# システム更新とPHP拡張機能
RUN apt-get update && apt-get install -y \
    libonig-dev \
    unzip \
    && docker-php-ext-install pdo_mysql mysqli mbstring

# ソースコードのコピー
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# ★ここが重要：起動時に毎回設定を強制的に直すスクリプトを作成
RUN echo '#!/bin/bash' > /usr/local/bin/start-apache.sh && \
    echo 'rm -f /etc/apache2/mods-enabled/mpm_*' >> /usr/local/bin/start-apache.sh && \
    echo 'a2enmod mpm_prefork' >> /usr/local/bin/start-apache.sh && \
    echo 'a2enmod rewrite' >> /usr/local/bin/start-apache.sh && \
    echo 'sed -i "s/80/${PORT}/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf' >> /usr/local/bin/start-apache.sh && \
    echo 'exec apache2-foreground' >> /usr/local/bin/start-apache.sh && \
    chmod +x /usr/local/bin/start-apache.sh

# 作成したスクリプトを起動コマンドとして指定
CMD ["/usr/local/bin/start-apache.sh"]