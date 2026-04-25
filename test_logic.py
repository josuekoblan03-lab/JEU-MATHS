from app import rooms, handle_create_solo_game, handle_timer_expired, handle_request_next_question, send_new_question, app
from unittest.mock import patch, MagicMock
import flask_socketio

# Mock request.sid
class MockRequest:
    sid = "MOCK_SID_123"

def test():
    with app.test_request_context():
        with patch('app.request', MockRequest()):
            with patch('app.socketio.emit') as mock_emit:
                # Create game
                handle_create_solo_game({'player_name': 'Test'})
                room_code = list(rooms.keys())[0]
                print(f"Created room: {room_code}")
                
                # Since delayed_first_question is async, let's manually trigger it
                send_new_question(room_code)
                
                # Check if new_question was emitted
                print("Emits after send_new_question:", mock_emit.call_args_list)
                mock_emit.reset_mock()
                
                # Trigger timer expired
                handle_timer_expired({'room_code': room_code})
                print("Emits after timer_expired:", mock_emit.call_args_list)
                mock_emit.reset_mock()
                
                # Trigger request next question
                handle_request_next_question({'room_code': room_code})
                print("Emits after request_next_question:", mock_emit.call_args_list)

test()
