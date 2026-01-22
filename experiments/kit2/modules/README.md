# Refactored Modules

This directory contains modules extracted from the monolithic `experiment-1-spring.js` file.

## Modules

### `SpringModel.js`
Manages the state of the experiment.
- Holds all state variables (`springLength`, `attachedWeights`, etc.)
- Implements the Observer pattern for state changes (subscribers).
- Provides methods to update state safely.

### `AttachmentManager.js`
Manages the queue of weight attachment operations.
- Ensures weights are attached sequentially to avoid physics glitches.
- Prevents race conditions during asynchronous animations.

## Future Refactoring Plan

1.  **View Extraction**: Move `drawDynamic`, `drawSpring`, etc. to `SpringView.js`.
2.  **Controller Extraction**: Move `handleDrag`, `onMouseDown`, etc. to `InteractionController.js`.
3.  **Logic Extraction**: Move `attachWeight`, `calculatePhysics` to `ExperimentLogic.js`.
