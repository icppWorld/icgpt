#!/usr/bin/env bash

cd src/frontend/assets/logo 

echo "Converting logo files in:"
pwd
echo " "

for COLOR in black cyan green orange pink purple red white yellow
do
  echo '-------------------------------------'
  ls icgpt-logo.dracula-$COLOR.svg
  convert -background transparent -define icon:auto-resize=192 icgpt-logo.dracula-$COLOR.svg favicon.dracula-$COLOR.ico
  mv favicon.dracula-$COLOR.ico ../favicon/

  echo '-------------------------------------'
  ls icgpt-logo.dracula-$COLOR.png
  convert -background transparent -resize 16x16 icgpt-logo.dracula-$COLOR.png icgpt-logo.dracula-$COLOR.16x16.png
  convert -background transparent -resize 32x32 icgpt-logo.dracula-$COLOR.png icgpt-logo.dracula-$COLOR.32x32.png
  
done
