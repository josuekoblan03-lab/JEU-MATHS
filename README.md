# 🎮 MathQuest - Arène de Calcul Mental 

![MathQuest Banner](https://img.shields.io/badge/Status-Actif-success) ![Python](https://img.shields.io/badge/Python-3.x-blue) ![Flask](https://img.shields.io/badge/Flask-Socket.IO-lightgrey) ![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6-yellow)

**MathQuest** est un jeu de calcul mental en temps réel, conçu pour être rapide, nerveux et visuellement immersif. Défiez vos amis dans des parties multijoueur synchronisées ou entraînez-vous en mode Solo avec différents niveaux de difficulté.

## ✨ Fonctionnalités Principales

*   **⚡ Temps Réel (WebSockets)** : Synchronisation instantanée entre les joueurs grâce à *Flask-SocketIO*. Le premier qui répond bloque la question pour les autres !
*   **🕹️ Mode Solo & Multijoueur** :
    *   **Solo** : Choisissez votre difficulté (Facile, Normal, Difficile) et tentez de faire un "Sans Faute" sur 5, 10 ou 20 questions.
    *   **Multijoueur** : Créez une salle privée avec un code unique, rejoignez vos amis et affrontez-les sur des séries de questions acharnées.
*   **⏱️ Chrono Implacable** : Vous avez exactement 10 secondes par question. Une barre de progression visuelle (CSS) se vide sous vos yeux.
*   **🔊 Audio Rétro-Arcade** : Un système audio entièrement synthétisé en Javascript (sans fichiers externes). Des sons de clics, de bonnes réponses ("coin" Mario), de mauvaises réponses ("buzzer") et une musique d'ambiance avec bouton Mute global.
*   **📊 Podium et Résultats** : Écran de fin de partie animé avec confettis, affichant le classement en multijoueur ou vos statistiques de réussite en Solo.

## 🎨 Design & Esthétique

L'interface a été méticuleusement conçue pour offrir un **design néon / cyberpunk** épuré et moderne :
*   **Effet Glassmorphism & 3D** : Les cartes et boutons utilisent des ombres portées, des bordures semi-transparentes et des transformations 3D (flip de carte pour la correction).
*   **Animations Fluides** : Utilisation de **GSAP** pour l'entrée en scène des éléments et de transitions CSS pures pour le timer et les retours visuels (rouge/vert).
*   **Palette de couleurs** : Fond sombre texturé (grid) contrasté par des touches de *Néon Cyan* (#00f3ff), *Violet* (#7a00ff) et *Doré* (#ffd700).

## 🛠️ Stack Technique

*   **Backend** : Python, Flask, Flask-SocketIO.
*   **Frontend** : HTML5, Vanilla CSS (Variables, Flexbox, Animations 3D), Vanilla JavaScript, GSAP.
*   **Audio** : Web Audio API (génération de signaux sonores natifs).

## 🚀 Installation & Lancement

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/josuekoblan03-lab/JEU-MATHS.git
   cd JEU-MATHS
   ```

2. **Installer les dépendances** :
   ```bash
   pip install -r requirements.txt
   ```

3. **Lancer le serveur** :
   ```bash
   python app.py
   ```

4. **Jouer** : Ouvrez votre navigateur et allez sur `http://localhost:5000` !
