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

# ★ここが変更点★
# 起動時に実行するスクリプトを作成
# 1. mpm_event, mpm_worker を無効化
# 2. mpm_prefork を有効化
# 3. ポート設定を書き換え
# 4. Apacheを起動
RUN echo '#!/bin/bash' > /usr/local/bin/start-apache.sh && \
    echo 'a2dismod mpm_event || true' >> /usr/local/bin/start-apache.sh && \
    echo 'a2dismod mpm_worker || true' >> /usr/local/bin/start-apache.sh && \
    echo 'a2enmod mpm_prefork' >> /usr/local/bin/start-apache.sh && \
    echo 'a2enmod rewrite' >> /usr/local/bin/start-apache.sh && \
    echo 'sed -i "s/80/${PORT}/g" /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf' >> /usr/local/bin/start-apache.sh && \
    echo 'exec apache2-foreground' >> /usr/local/bin/start-apache.sh && \
    chmod +x /usr/local/bin/start-apache.sh

# 作成したスクリプトを起動コマンドとして指定
CMD ["/usr/local/bin/start-apache.sh"]