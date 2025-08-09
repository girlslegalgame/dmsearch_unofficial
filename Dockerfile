# 1. ベースとなる公式のPHP+Apache環境を選ぶ
FROM php:8.2-apache

# 2. プロジェクトのすべてのファイルを、Webサーバーの公開フォルダにコピーする
# (もしpublicフォルダなどを使っている場合は 'COPY public/ /var/www/html/' のように変更)
COPY . /var/www/html/

# 3. Apacheの書き換えモジュールを有効にする（.htaccessを使う場合に必要）
RUN a2enmod rewrite