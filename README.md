# LaxMaps (Lacrosse Play Maker)

A whiteboard app for lacrosse coaches and players. Draw a play on a real field diagram, save it, and send it to the team as an image.

Built in 10th grade, February to March 2025.

## What it does

- Place offense (X) and defense (O) markers on the field, then drag them into position
- Draw lines and arrows for cuts and passes, solid or dashed
- In remove mode, tap a marker or the end of a line to delete it
- Undo and redo through a full history stack
- Save plays by name to the device (AsyncStorage) and reload them later
- Export the board as a PNG and share it through the system share sheet
- Switch between three field layouts

## How it works

The whole board is a single state object (`markers` and `lines`). Every edit pushes a copy onto a history array, so undo and redo move an index through that array instead of reversing individual actions. Markers use `PanResponder` for dragging, lines render as SVG through `react-native-svg`, and `react-native-view-shot` captures the board view for sharing.

| File | Role |
| --- | --- |
| `App.js` | Board state, history, touch modes, save and share logic |
| `components/Marker.js` | Draggable X and O player markers |
| `components/Arrow.js` | Line and arrowhead rendering |
| `assets/lacrosse_field*.png` | Field backgrounds |

## Stack

React Native 0.76, Expo SDK 52, react-native-svg, react-native-gesture-handler, react-native-reanimated, AsyncStorage

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for the iOS simulator.
