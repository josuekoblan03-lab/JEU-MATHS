"""
╔══════════════════════════════════════════════════════════════╗
║  MATHQUEST — Jeu de Calcul Multijoueur en Temps Réel        ║
║  Backend Flask + Flask-SocketIO                              ║
╚══════════════════════════════════════════════════════════════╝

Gère :
  - Création / gestion des salles (en mémoire)
  - Génération aléatoire de questions mathématiques
  - Vérification des réponses avec verrou anti-double
  - Synchronisation temps réel via Socket.IO
"""

import random
import threading
import string
import math
from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, emit, join_room, leave_room

# ─────────────────────────────────────────────
# Configuration Flask
# ─────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mathquest-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ─────────────────────────────────────────────
# Stockage en mémoire
# ─────────────────────────────────────────────
# Structure d'une salle :
# {
#   'code': str,
#   'host': str (sid),
#   'players': { sid: { 'name': str, 'score': int } },
#   'player_order': [sid, ...],  # Ordre d'arrivée
#   'current_question': { 'display': str, 'answer': int/float },
#   'answered': bool,  # Verrou : question déjà répondue ?
#   'answered_by': str | None,  # sid du joueur qui a répondu
#   'used_questions': set(),  # Questions déjà posées (éviter doublons)
#   'winning_score': int,
#   'game_started': bool,
#   'question_number': int,
# }
rooms = {}


# ─────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────
def generate_room_code(length=6):
    """Génère un code de salle unique de 6 caractères alphanumériques majuscules."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in rooms:
            return code


def generate_question(used_questions, difficulty='normal'):
    """
    Génère une question mathématique aléatoire adaptée au niveau de difficulté.
    Retourne { 'display': str, 'answer': number }
    """
    max_attempts = 100
    for _ in range(max_attempts):
        
        # Sélection des types d'opération et des plages de nombres selon la difficulté
        if difficulty == 'facile':
            q_type = random.choices(['simple_add', 'simple_sub', 'simple_mul'], weights=[5, 4, 1], k=1)[0]
        elif difficulty == 'difficile':
            q_type = random.choice([
                'simple_mul', 'simple_div', 'double_add', 'mixed_ops', 'parentheses', 'mul_add', 'triple_ops'
            ])
        else: # normal
            q_type = random.choices([
                'simple_add', 'simple_sub', 'simple_mul', 'simple_div',
                'double_add', 'mixed_ops', 'parentheses', 'mul_add'
            ], weights=[4, 4, 3, 3, 1, 1, 1, 1], k=1)[0]

        if q_type == 'simple_add':
            if difficulty == 'facile':
                a, b = random.randint(1, 10), random.randint(1, 10)
            elif difficulty == 'difficile':
                a, b = random.randint(15, 50), random.randint(15, 50)
            else:
                a, b = random.randint(1, 15), random.randint(1, 15)
            display = f"{a} + {b}"
            answer = a + b

        elif q_type == 'simple_sub':
            if difficulty == 'facile':
                a = random.randint(5, 15)
                b = random.randint(1, a - 1)
            elif difficulty == 'difficile':
                a = random.randint(20, 80)
                b = random.randint(5, a - 1)
            else:
                a = random.randint(5, 20)
                b = random.randint(1, a - 1)
            display = f"{a} − {b}"
            answer = a - b

        elif q_type == 'simple_mul':
            if difficulty == 'facile':
                a, b = random.randint(2, 5), random.randint(2, 5)
            elif difficulty == 'difficile':
                a, b = random.randint(5, 15), random.randint(5, 15)
            else:
                a, b = random.randint(2, 9), random.randint(2, 9)
            display = f"{a} * {b}"
            answer = a * b

        elif q_type == 'simple_div':
            if difficulty == 'difficile':
                b = random.randint(3, 15)
                c = random.randint(3, 15)
            else:
                b = random.randint(2, 9)
                c = random.randint(2, 9)
            a = b * c
            display = f"{a} ÷ {b}"
            answer = c

        elif q_type == 'double_add':
            if difficulty == 'difficile':
                a, b, c = random.randint(10, 30), random.randint(10, 30), random.randint(10, 30)
            else:
                a, b, c = random.randint(1, 10), random.randint(1, 10), random.randint(1, 10)
            display = f"{a} + {b} + {c}"
            answer = a + b + c

        elif q_type == 'mixed_ops':
            if difficulty == 'difficile':
                a, b = random.randint(10, 40), random.randint(10, 30)
                c = random.randint(5, 20)
            else:
                a, b = random.randint(1, 15), random.randint(1, 10)
                c = random.randint(1, 10)
            display = f"{a} + {b} − {c}"
            answer = a + b - c

        elif q_type == 'parentheses':
            if difficulty == 'difficile':
                a, b = random.randint(5, 15), random.randint(5, 15)
                c = random.randint(3, 8)
            else:
                a, b = random.randint(1, 5), random.randint(1, 5)
                c = random.randint(2, 5)
            display = f"({a} + {b}) * {c}"
            answer = (a + b) * c

        elif q_type == 'mul_add':
            if difficulty == 'difficile':
                a, b = random.randint(3, 9), random.randint(3, 9)
                c = random.randint(10, 50)
            else:
                a, b = random.randint(2, 5), random.randint(2, 5)
                c = random.randint(1, 10)
            display = f"{a} * {b} + {c}"
            answer = a * b + c

        elif q_type == 'triple_ops':
            if difficulty == 'difficile':
                a = random.randint(10, 30)
                b = random.randint(5, 20)
                c = random.randint(5, 20)
                d = random.randint(5, 20)
            else:
                a = random.randint(1, 10)
                b = random.randint(1, 10)
                c = random.randint(1, 10)
                d = random.randint(1, 10)
            display = f"{a} + {b} − {c} + {d}"
            answer = a + b - c + d

        # Assurer un résultat positif et entier
        if answer >= 0 and answer == int(answer) and display not in used_questions:
            used_questions.add(display)
            return {'display': display, 'answer': int(answer)}

    # Fallback si on ne trouve rien de nouveau
    a, b = random.randint(1, 10), random.randint(1, 10)
    display = f"{a} + {b}"
    answer = a + b
    return {'display': display, 'answer': answer}


def get_room_players(room_code):
    """Retourne la liste des joueurs avec noms et scores, triés par ordre d'arrivée."""
    room = rooms.get(room_code)
    if not room:
        return []
    players = []
    for sid in room['player_order']:
        if sid in room['players']:
            p = room['players'][sid]
            players.append({
                'id': sid,
                'name': p['name'],
                'score': p['score']
            })
    return players


def get_rankings(room_code):
    """Retourne le classement final trié par score décroissant."""
    players = get_room_players(room_code)
    return sorted(players, key=lambda p: p['score'], reverse=True)


# ─────────────────────────────────────────────
# Routes Flask
# ─────────────────────────────────────────────
@app.route('/')
def index():
    """Page d'accueil — Créer ou rejoindre une salle."""
    return render_template('index.html')


@app.route('/lobby/<room_code>')
def lobby(room_code):
    """Salle d'attente — Voir les joueurs connectés."""
    if room_code not in rooms:
        return redirect(url_for('index'))
    return render_template('lobby.html', room_code=room_code)


@app.route('/game/<room_code>')
def game(room_code):
    """Page de jeu — Questions et réponses en temps réel."""
    if room_code not in rooms:
        return redirect(url_for('index'))
    return render_template('game.html', room_code=room_code)


@app.route('/result/<room_code>')
def result(room_code):
    """Page de résultats — Podium et classement."""
    if room_code not in rooms:
        return redirect(url_for('index'))
    return render_template('result.html', room_code=room_code)


# ─────────────────────────────────────────────
# Événements Socket.IO
# ─────────────────────────────────────────────

@socketio.on('connect')
def handle_connect():
    """Un client se connecte."""
    print(f"[CONNECT] {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    """Un client se déconnecte — attendre 3s avant de le retirer (pour gérer les changements de page)."""
    sid = request.sid
    for code, room in list(rooms.items()):
        if sid in room['players']:
            player_name = room['players'][sid]['name']
            
            def delayed_cleanup(room_code, player_sid, p_name):
                time.sleep(3)
                # Si le SID est toujours dans les joueurs après 3s, ça veut dire qu'il n'a pas été
                # remplacé par une reconnexion (changement de page).
                if room_code in rooms and player_sid in rooms[room_code]['players']:
                    del rooms[room_code]['players'][player_sid]
                    if player_sid in rooms[room_code]['player_order']:
                        rooms[room_code]['player_order'].remove(player_sid)
                    
                    # Si c'était l'hôte, donner le rôle au suivant
                    if rooms[room_code]['host'] == player_sid:
                        rooms[room_code]['host'] = rooms[room_code]['player_order'][0] if rooms[room_code]['player_order'] else None

                    socketio.emit('player_left', {
                        'player_name': p_name,
                        'players': get_room_players(room_code)
                    }, room=room_code)
                    
                    # Supprimer la salle si vide
                    if len(rooms[room_code]['players']) == 0:
                        del rooms[room_code]
                        print(f"[ROOM DELETED] {room_code} (empty)")
            
            threading.Thread(target=delayed_cleanup, args=(code, sid, player_name), daemon=True).start()
            break


@socketio.on('create_room')
def handle_create_room(data):
    """
    Créer une nouvelle salle sans y ajouter le joueur (il le fera au join_room).
    """
    sid = request.sid
    player_name = data.get('player_name', 'Joueur').strip()
    winning_score = int(data.get('winning_score', 10))

    if not player_name:
        player_name = 'Joueur'

    code = generate_room_code()
    rooms[code] = {
        'code': code,
        'host': None,  # Sera défini au premier join_room
        'players': {},
        'player_order': [],
        'current_question': None,
        'answered': False,
        'answered_by': None,
        'used_questions': set(),
        'winning_score': winning_score,
        'game_started': False,
        'question_number': 0,
        'is_solo': False,
    }

    print(f"[ROOM CREATED] {code} by {player_name} (score to win: {winning_score})")

    emit('room_created', {
        'room_code': code,
        'player_name': player_name
    })

@socketio.on('create_solo_game')
def handle_create_solo_game(data):
    """Créer une partie solo et la démarrer immédiatement."""
    sid = request.sid
    player_name = data.get('player_name', 'Joueur').strip()
    winning_score = int(data.get('winning_score', 10))
    difficulty = data.get('difficulty', 'normal')

    if not player_name:
        player_name = 'Joueur'

    code = generate_room_code()
    rooms[code] = {
        'code': code,
        'host': sid,
        'players': {sid: {'name': player_name, 'score': 0}},
        'player_order': [sid],
        'current_question': None,
        'answered': False,
        'answered_by': None,
        'used_questions': set(),
        'winning_score': winning_score,
        'game_started': True,
        'question_number': 0,
        'is_solo': True,
        'difficulty': difficulty,
    }

    join_room(code)
    print(f"[SOLO CREATED] {code} by {player_name}")

    emit('solo_game_started', {
        'room_code': code,
        'player_name': player_name
    })

    def delayed_first_question():
        time.sleep(1.5)
        send_new_question(code)
    threading.Thread(target=delayed_first_question, daemon=True).start()


@socketio.on('join_room')
def handle_join_room(data):
    """
    Rejoindre une salle existante. Gère la reconnexion lors des changements de page.
    """
    sid = request.sid
    code = data.get('room_code', '').strip().upper()
    player_name = data.get('player_name', 'Joueur').strip()

    if not player_name:
        player_name = 'Joueur'

    if code not in rooms:
        emit('join_error', {'message': 'Salle introuvable. Vérifiez le code.'})
        return

    room = rooms[code]

    # Vérifier s'il s'agit d'une reconnexion (changement de page)
    old_sid = None
    for p_sid, p_data in list(room['players'].items()):
        if p_data['name'] == player_name:
            old_sid = p_sid
            break

    if old_sid:
        # Reconnexion : transférer les données de l'ancien SID vers le nouveau
        room['players'][sid] = room['players'].pop(old_sid)
        idx = room['player_order'].index(old_sid)
        room['player_order'][idx] = sid
        if room['host'] == old_sid:
            room['host'] = sid
        if room['answered_by'] == old_sid:
            room['answered_by'] = sid
        print(f"[RECONNECT] {player_name} reconnected to room {code} with new SID")
    else:
        # Nouveau joueur
        if room['game_started']:
            emit('join_error', {'message': 'La partie a déjà commencé.'})
            return

        if len(room['players']) >= 8:
            emit('join_error', {'message': 'La salle est pleine (8 joueurs max).'})
            return

        # Assigner le rôle d'hôte au premier arrivé
        if room['host'] is None:
            room['host'] = sid

        room['players'][sid] = {'name': player_name, 'score': 0}
        room['player_order'].append(sid)
        print(f"[JOIN] {player_name} joined room {code}")

    join_room(code)

    socketio.emit('room_joined', {
        'room_code': code,
        'player_name': player_name
    }, room=code)

    # Notifier tous les joueurs
    socketio.emit('player_joined', {
        'player_name': player_name,
        'players': get_room_players(code),
        'is_host': room['host'] == sid
    }, room=code)

    # Si la partie est déjà lancée et qu'une question est en cours,
    # on la renvoie au joueur pour qu'il puisse rattraper (rattrape la condition de course)
    if room['game_started'] and room['current_question']:
        emit('new_question', {
            'question': room['current_question']['display'],
            'question_number': room['question_number'],
            'scores': get_room_players(code),
            'is_solo': room.get('is_solo', False)
        })


@socketio.on('start_game')
def handle_start_game(data):
    """
    L'hôte lance la partie.
    data: { 'room_code': str }
    """
    sid = request.sid
    code = data.get('room_code', '').strip().upper()

    if code not in rooms:
        return

    room = rooms[code]

    if room['host'] != sid:
        emit('error', {'message': "Seul l'hôte peut lancer la partie."})
        return

    if len(room['players']) < 1:
        emit('error', {'message': 'Il faut au moins 2 joueurs pour commencer.'})
        return

    room['game_started'] = True
    print(f"[GAME START] Room {code} - {len(room['players'])} players")

    socketio.emit('game_started', {'room_code': code}, room=code)

    # Envoyer la première question après un court délai
    def delayed_first_question():
        socketio.sleep(1.5)
        send_new_question(code)
    socketio.start_background_task(delayed_first_question)


def send_new_question(room_code):
    """Génère et envoie une nouvelle question à tous les joueurs de la salle."""
    if room_code not in rooms:
        return

    room = rooms[room_code]
    room['answered'] = False
    room['answered_by'] = None
    room['question_number'] += 1
    difficulty = room.get('difficulty', 'normal')

    question = generate_question(room['used_questions'], difficulty)
    room['current_question'] = question

    safe_display = question['display'].replace('−', '-').replace('×', '*')
    print(f"[QUESTION #{room['question_number']}] {safe_display} = {question['answer']} (Room: {room_code})")

    socketio.emit('new_question', {
        'question': question['display'],
        'question_number': room['question_number'],
        'scores': get_room_players(room_code),
        'is_solo': room.get('is_solo', False)
    }, room=room_code)

    # Démarrer le chronomètre de 10s UNIQUEMENT pour le mode solo
    if room.get('is_solo'):
        q_num = room['question_number']
        def timeout_check():
            if room_code in rooms:
                r = rooms[room_code]
                if r['question_number'] == q_num and not r['answered']:
                    # Temps écoulé !
                    r['answered'] = True
                    socketio.emit('time_up', {
                        'message': '⏳ Temps écoulé (10s) !',
                        'answer': r['current_question']['answer']
                    }, room=room_code)
                    
                    if r['question_number'] >= r['max_questions']:
                        r['game_started'] = False
                        def delayed_game_over():
                            socketio.sleep(2.5)
                            rankings = get_rankings(room_code)
                            winner_name = list(r['players'].values())[0]['name'] if r['players'] else "Joueur"
                            if not r.get('is_solo') and rankings:
                                winner_name = rankings[0]['name']

                            socketio.emit('game_over', {
                                'winner': winner_name,
                                'rankings': rankings,
                                'room_code': room_code,
                                'is_solo': r.get('is_solo', False),
                                'max_questions': r['max_questions']
                            }, room=room_code)
                        socketio.start_background_task(delayed_game_over)
                    else:
                        def delayed_next():
                            socketio.sleep(2.5)
                            send_new_question(room_code)
                        socketio.start_background_task(delayed_next)

        def timer_task():
            socketio.sleep(10.0)
            timeout_check()
        socketio.start_background_task(timer_task)


@socketio.on('submit_answer')
def handle_submit_answer(data):
    """
    Un joueur soumet une réponse.
    data: { 'room_code': str, 'answer': str }
    Verrou : seul le 1er joueur avec la bonne réponse marque.
    """
    sid = request.sid
    code = data.get('room_code', '').strip().upper()
    answer_str = data.get('answer', '').strip()

    if code not in rooms:
        return

    room = rooms[code]

    if sid not in room['players']:
        return

    if not room['current_question']:
        return

    # ─── VERROU : déjà répondu ? ───
    if room['answered']:
        socketio.emit('too_late', {
            'message': 'Trop tard ! Un autre joueur a déjà répondu.',
            'answered_by': room['players'].get(room['answered_by'], {}).get('name', '?')
        }, to=sid)
        return

    # Vérifier la réponse
    try:
        player_answer = int(answer_str)
    except (ValueError, TypeError):
        socketio.emit('wrong_answer', {'message': 'Réponse invalide. Entrez un nombre.'}, to=sid)
        return

    correct_answer = room['current_question']['answer']
    player_name = room['players'][sid]['name']

    if player_answer == correct_answer:
        # ─── BONNE RÉPONSE ! ───
        room['answered'] = True
        room['answered_by'] = sid
        room['players'][sid]['score'] += 1
        new_score = room['players'][sid]['score']

        print(f"[CORRECT] {player_name} answered {correct_answer} (Score: {new_score}) - Room {code}")

        # Notifier tout le monde
        socketio.emit('correct_answer', {
            'player_id': sid,
            'player_name': player_name,
            'answer': correct_answer,
            'question': room['current_question']['display'],
            'scores': get_room_players(code)
        }, room=code)

        # Vérifier si on a fini
        is_over = False
        if room['question_number'] >= room['max_questions']:
            is_over = True

        if is_over:
            room['game_started'] = False
            print(f"[GAME OVER] {player_name} finishes! Room {code}")
            
            def delayed_game_over():
                socketio.sleep(2.0)
                rankings = get_rankings(code)
                winner_name = player_name
                if not room.get('is_solo') and rankings:
                    winner_name = rankings[0]['name']

                socketio.emit('game_over', {
                    'winner': winner_name,
                    'rankings': rankings,
                    'room_code': code,
                    'is_solo': room.get('is_solo', False),
                    'max_questions': room['max_questions']
                }, room=code)
                
            socketio.start_background_task(delayed_game_over)
        else:
            # Prochaine question après un délai
            def delayed_next():
                try:
                    socketio.sleep(2.5)
                    send_new_question(code)
                except Exception as e:
                    print(f"ERROR in delayed_next: {e}")
                    socketio.emit('error', {'message': f'Server error: {e}'}, room=code)
            socketio.start_background_task(delayed_next)

    else:
        # ─── MAUVAISE RÉPONSE ───
        socketio.emit('wrong_answer', {
            'message': f'Mauvaise réponse ! {player_answer} n\'est pas correct.'
        }, to=sid)
        print(f"[WRONG] {player_name} answered {player_answer} (expected {correct_answer}) - Room {code}")


@socketio.on('request_scores')
def handle_request_scores(data):
    """Demander les scores actuels (utilisé au chargement de la page résultat)."""
    code = data.get('room_code', '').strip().upper()
    if code in rooms:
        rankings = get_rankings(code)
        emit('scores_update', {
            'rankings': rankings,
            'room_code': code
        })


@socketio.on('play_again')
def handle_play_again(data):
    """Rejouer — réinitialiser les scores et relancer."""
    code = data.get('room_code', '').strip().upper()
    if code not in rooms:
        return

    room = rooms[code]

    # Reset scores
    for sid in room['players']:
        room['players'][sid]['score'] = 0

    room['used_questions'] = set()
    room['question_number'] = 0
    room['answered'] = False
    room['answered_by'] = None
    room['current_question'] = None
    room['game_started'] = False

    if room.get('is_solo'):
        room['game_started'] = True
        socketio.emit('solo_restart', {'room_code': code}, room=code)
        def delayed_first_question():
            socketio.sleep(2.5)
            send_new_question(code)
        socketio.start_background_task(delayed_first_question)
    else:
        socketio.emit('go_to_lobby', {'room_code': code}, room=code)


# ─────────────────────────────────────────────
# Lancement du serveur
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  MATHQUEST — Serveur démarré")
    print("  http://localhost:5000")
    print("=" * 55)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
