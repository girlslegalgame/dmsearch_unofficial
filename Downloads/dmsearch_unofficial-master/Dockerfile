# ベースイメージ
FROM php:8.2-apache

# ★キャッシュを確実に無効化するための環境変数（日付を変えると再ビルドされます）
ENV REFRESH_BUILD=2026-02-13-v2

# システム更新とPHP拡張機能
RUN apt-get update && apt-get install -y \
    libonig-dev \
    unzip \
    && docker-php-ext-install pdo_mysql mysqli mbstring

# 【重要】Apache MPM設定の完全リセット
# 1. 既存のMPM設定ファイル（event, worker, preforkすべて）を物理的に削除
# 2. その後、mpm_prefork だけを有効化
# 3. mod_rewrite を有効化
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load \
    && rm -f /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork \
    && a2enmod rewrite

# Railwayのポート設定対応（ポート80を環境変数PORTに置換）
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# ソースコードのコピー
COPY . /var/www/html/

# 権限設定
RUN chown -R www-data:www-data /var/www/html

# 起動コマンド
CMD ["apache2-foreground"]