import socketio
import time

sio = socketio.Client()
room_code = None

@sio.event
def connect():
    print("Connected to server!")
    sio.emit('create_solo_game', {'player_name': 'BotTest'})

@sio.on('solo_game_started')
def on_started(data):
    global room_code
    room_code = data['room_code']
    print(f"Game started! Room: {room_code}")
    sio.emit('join_room', {'room_code': room_code, 'player_name': 'BotTest'})
    print("Joined room.")

@sio.on('new_question')
def on_new_question(data):
    print(f"Received new_question: {data}")
    # Answer the question correctly
    ans = data['question'].split(' ')[0] # just dummy
    parts = data['question'].split(' ')
    if len(parts) >= 3:
        a = int(parts[0])
        op = parts[1]
        b = int(parts[2])
        if op == '+': ans = a+b
        elif op == '-': ans = a-b
        elif op == '*': ans = a*b
    print(f"Submitting answer: {ans}")
    sio.emit('submit_answer', {'room_code': room_code, 'answer': str(ans)})

@sio.on('correct_answer')
def on_correct(data):
    print(f"Received correct_answer: {data}")

@sio.on('wrong_answer')
def on_wrong(data):
    print(f"Received wrong_answer: {data}")

@sio.on('time_up')
def on_time_up(data):
    print(f"Received time_up: {data}")

@sio.on('too_late')
def on_too_late(data):
    print(f"Received too_late: {data}")

sio.connect('http://localhost:5000', transports=['websocket'])
sio.wait()
