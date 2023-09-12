# The icgpt logo

The logo for each dracula color can be found in Google Drawings files in this [Google Drive folder](https://drive.google.com/drive/folders/14XZAlkVkdIco_hlouFbmg_8Zr3-Y6zuB).

# How to create the files

## 1. Draw & Download

- Copy one of the other Google drawing files

- Open it up & assign color

- File > Download

  - png

  - svg

## 2. Convert to favicon & resize

### Option 1: All in one script

- Move all the .svg & .png files into the folder of this README.md

- From the project root folder, run the script:

  ```bash
  ./scripts/logo_convert_files.sh
  ```

### Option 2: Individual files

- favicon.ico from .svg

  ```bash
  convert -background transparent -define icon:auto-resize=192 file.svg favicon.ico
  ```

- resize a .png

  ```bash
  convert -background transparent -resize 16x16 file.png file.16x16.png
  ```

# Appendix A: Color Values in hsl & hex

The dracula-ui colors are defined in this [colors.css](https://github.com/dracula/dracula-ui/blob/master/src/styles/colors.css) in the dracula-ui GitHub repo.

| dracula name | hsl of colors.css   | hex <br>(convert with [hsl-to-hex](https://htmlcolors.com/hsl-to-hex)) |
| ------------ | ------------------- | ---------------------------------------------------------------------- |
| black        | hsl(230, 15%, 15%)  | #21222c                                                                |
| white        | hsl(60, 30%, 96%)   | #f8f8f2                                                                |
| cyan         | hsl(170, 100%, 75%) | #80ffea                                                                |
| green        | hsl(115, 100%, 75%) | #8aff80                                                                |
| orange       | hsl(35, 100%, 75%)  | #ffca80                                                                |
| pink         | hsl(330, 100%, 75%) | #ff80bf                                                                |
| purple       | hsl(250, 100%, 75%) | #9580ff                                                                |
| red          | hsl(10, 100%, 75%)  | #ff9580                                                                |
| yellow       | hsl(60, 100%, 75%)  | #ffff80                                                                |
