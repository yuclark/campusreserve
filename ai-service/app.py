from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/suggest-room', methods=['POST'])
def suggest_room():
    data = request.json
    
    # Extract parameters
    num_people = data.get('numPeople', 1)
    preferred_time = data.get('preferredTime', 'morning')
    date = data.get('date')
    available_rooms = data.get('availableRooms', [])
    
    print(f"AI Request: {num_people} people, {preferred_time}, {len(available_rooms)} rooms available")
    
    # Filter rooms by capacity (must fit the number of people)
    suitable_rooms = [
        room for room in available_rooms 
        if room['capacity'] >= num_people
    ]
    
    if not suitable_rooms:
        return jsonify({
            'success': False,
            'message': 'No suitable rooms found for the requested capacity'
        })
    
    # Pick room with smallest capacity that fits (most efficient)
    best_room = min(suitable_rooms, key=lambda r: r['capacity'])
    
    # Suggest time based on preference
    time_suggestions = {
        'morning': ('08:00', '10:00'),
        'afternoon': ('13:00', '15:00'),
        'evening': ('18:00', '20:00')
    }
    
    suggested_time = time_suggestions.get(preferred_time.lower(), ('09:00', '11:00'))
    
    return jsonify({
        'success': True,
        'suggestion': {
            'classroom': best_room,
            'startTime': suggested_time[0],
            'endTime': suggested_time[1],
            'reason': f'Best fit for {num_people} people during {preferred_time}. Room capacity: {best_room["capacity"]} seats.'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'AI service is running'})

if __name__ == '__main__':
    print("🤖 AI Service starting on http://localhost:5000")
    app.run(port=5000, debug=True)
