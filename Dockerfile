# ベースとなる公式のPHP+Apache環境を選ぶ
FROM php:8.2-apache

# ★★★ここから追加するコード★★★
# PDO MySQL拡張機能をインストールする
RUN docker-php-ext-install pdo_mysql
# ★★★ここまで追加するコード★★★

# プロジェクトのファイルをWebサーバーの公開フォルダにコピーする
COPY . /var/www/html/

# Apacheの書き換えモジュールを有効にする（.htaccessを使う場合に必要）
RUN a2enmod rewrite

# Force redeploy on Sep 09, 2025
