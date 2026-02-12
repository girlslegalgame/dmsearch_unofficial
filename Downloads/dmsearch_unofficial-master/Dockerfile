# ベースイメージの指定
FROM php:8.2-apache

# システムの更新とPHP拡張機能のインストール
# libonig-dev は mbstring に必要
RUN apt-get update && apt-get install -y \
    libonig-dev \
    unzip \
    && docker-php-ext-install pdo_mysql mysqli mbstring

# Apacheのモジュール設定
# mod_rewrite を有効化
RUN a2enmod rewrite

# mpm_event を無効化し、mpm_prefork を有効化
# php:apache イメージはデフォルトで mpm_event が有効になっているため、
# PHPを使う場合は prefork に切り替えるのが一般的。
# 既に無効化されている場合でもエラーにならないよう rm -f を使用。
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load \
    && rm -f /etc/apache2/mods-enabled/mpm_event.conf \
    && a2enmod mpm_prefork

# Railwayのポート設定に対応
# Railwayは環境変数 PORT で指定されたポートで待機する必要があるため、
# Apacheのデフォルトポート (80) を環境変数の値に書き換える。
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# ソースコードをWebサーバーの公開ディレクトリにコピー
COPY . /var/www/html/

# Webサーバーがファイルにアクセスできるよう権限を設定 (念のため)
RUN chown -R www-data:www-data /var/www/html

# コンテナ起動時にApacheをフォアグラウンドで実行
# FROM php:8.2-apache イメージにはすでにこれが含まれているため、
# 通常は不要ですが、明示的に記述することで確実性を高める。
CMD ["apache2-foreground"]