@echo off
REM ===================================================================
REM  La demarche de prevention - PREVISUALISATION SUR VOTRE PC
REM
REM  Le jeu se joue normalement en ligne, depuis un simple lien :
REM     https://hiiato.github.io/CSE-training/demarche-prevention/
REM
REM  Ce fichier ne sert qu'a verifier une modification AVANT de la
REM  mettre en ligne. Il n'est pas accessible depuis un telephone.
REM  Laissez la fenetre noire ouverte ; fermez-la pour arreter.
REM ===================================================================
cd /d "%~dp0"

set PORT=8080

where python >nul 2>nul
if %errorlevel%==0 goto lancer

echo.
echo   Python n'a pas ete trouve sur cet ordinateur.
echo   La previsualisation locale a besoin de Python.
echo   Le jeu en ligne, lui, fonctionne sans rien installer :
echo   https://hiiato.github.io/CSE-training/demarche-prevention/
echo.
pause
exit /b 1

:lancer
echo.
echo   Previsualisation sur http://localhost:%PORT%
echo   Laissez cette fenetre ouverte. Fermez-la pour arreter.
echo.
start "" "http://localhost:%PORT%/index.html"
python -m http.server %PORT% --bind 127.0.0.1
