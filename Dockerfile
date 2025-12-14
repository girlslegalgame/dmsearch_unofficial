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
# mpm_event を無効化して mpm_prefork を有効にする（PHPを使う場合の一般的な構成）
FROM php:8.2-apache
# (もし他のCOPYなどの記述があればここに)
COPY . /var/www/html/

# ↓ここを修正: a2dismodではなく、ファイルを直接削除して確実に無効化する
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load \
    && rm -f /etc/apache2/mods-enabled/mpm_event.conf \
    && a2enmod mpm_prefork
CMD /bin/bash -c "rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf && apache2-foreground"
# Force redeploy on Sep 09, 2025



