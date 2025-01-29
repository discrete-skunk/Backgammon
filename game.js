document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('backgammonBoard');
    const board = new BackgammonBoard(canvas);
    
    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    const analyzeMoveBtn = document.getElementById('analyzeMoveBtn');
    const modal = document.getElementById('moveModal');
    const closeModal = document.querySelector('.close');
    const moveAdvice = document.getElementById('moveAdvice');
    const playerToggle = document.getElementById('playerToggle');
    let currentDice = [1, 1];  // Initialize with default values

    // Dice patterns for 1-6 (matching real dice patterns)
    const dicePatterns = {
        1: [4],                    // Center
        2: [2, 6],                // Diagonal
        3: [2, 4, 6],             // Diagonal with center
        4: [0, 2, 6, 8],          // Four corners
        5: [0, 2, 4, 6, 8],       // Four corners and center
        6: [0, 2, 3, 5, 6, 8]     // Two columns of three
    };

    function updateDice(dieElement, value) {
        // Clear existing dots
        dieElement.innerHTML = '';
        
        // Create a 3x3 grid for dots
        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('div');
            dot.className = dicePatterns[value].includes(i) ? 'die-dot' : 'die-empty';
            dieElement.appendChild(dot);
        }
    }

    // Roll dice button click handler
    const rollDiceBtn = document.getElementById('rollDice');
    rollDiceBtn.addEventListener('click', () => {
        const die1Value = Math.floor(Math.random() * 6) + 1;
        const die2Value = Math.floor(Math.random() * 6) + 1;
        currentDice = [die1Value, die2Value];
        updateDice(die1, die1Value);
        updateDice(die2, die2Value);
    });

    // Individual dice click handlers
    die1.addEventListener('click', () => {
        const newValue = (currentDice[0] % 6) + 1;
        currentDice[0] = newValue;
        updateDice(die1, newValue);
    });

    die2.addEventListener('click', () => {
        const newValue = (currentDice[1] % 6) + 1;
        currentDice[1] = newValue;
        updateDice(die2, newValue);
    });

    // Initialize dice with values
    updateDice(die1, 1);
    updateDice(die2, 1);
    currentDice = [1, 1];

    // Player toggle handling
    playerToggle.addEventListener('click', () => {
        const newPlayer = board.currentPlayer === 'white' ? 'black' : 'white';
        board.currentPlayer = newPlayer;
        playerToggle.className = newPlayer === 'white' ? 'player-white' : 'player-black';
        board.updatePipCounts();
    });

    // Reset button click handler
    document.getElementById('resetBoard').addEventListener('click', () => {
        // Clear the board first
        board.points.forEach(point => {
            point.pieces = [];
            point.color = null;
        });
        board.bar = { white: [], black: [] };
        
        // Then initialize
        board.initializeBoard();
        
        // Reset player to white
        board.currentPlayer = 'white';
        playerToggle.className = 'player-white';
        
        // Reset dice to 1,1
        currentDice = [1, 1];
        updateDice(die1, 1);
        updateDice(die2, 1);
        
        board.updatePipCounts();
    });

    // Best move button click handler
    analyzeMoveBtn.addEventListener('click', () => {
        const die1Value = currentDice[0] || 1;
        const die2Value = currentDice[1] || 1;
        const moveInfo = board.getBestMove([die1Value, die2Value]);
        
        // Update modal header with current player
        document.getElementById('pipCounts').textContent = 
            `Current player: ${board.currentPlayer.charAt(0).toUpperCase() + board.currentPlayer.slice(1)}`;

        // Display move advice
        document.getElementById('moveAdvice').textContent = moveInfo;
        
        modal.style.display = 'block';
    });

    function estimatePipReduction(move, player) {
        if (!move) return 0;
        
        if (move.type === 'bar') {
            return player === 'white' ? 25 - move.to : move.to + 1;
        } else if (move.type === 'bearoff') {
            return player === 'white' ? move.from + 1 : 24 - move.from;
        } else if (move.type === 'normal') {
            // For both players, pip reduction is simply the number of points moved
            return Math.abs(move.from - move.to);
        }
        return 0;
    }

    // Execute move button handlers
    document.getElementById('executeMove').addEventListener('click', () => {
        if (board.bestMoveSequence && board.bestMoveSequence.length > 0) {
            board.bestMoveSequence.forEach(move => {
                if (move.type === 'bar') {
                    board.moveFromBar(move.to);
                } else {
                    board.movePiece(move.from, move.to);
                }
            });
            board.updatePipCounts();
            board.bestMoveSequence = null;
        }
        modal.style.display = 'none';
    });

    // Modal close button
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Click outside modal to close
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    function analyzeBoardPosition(board, player) {
        const analysis = {
            blots: { player: [], opponent: [] },
            points: { player: [], opponent: [] },
            piecesInHome: 0,
            piecesInOpponentHome: 0,
            pipCount: 0,
            opponentPipCount: 0
        };

        // Calculate pip counts and analyze board position
        board.points.forEach((point, i) => {
            const pointValue = player === 'white' ? (24 - i) : (i + 1);
            
            if (point.pieces.length === 1) {
                if (point.color === player) {
                    analysis.blots.player.push(i);
                    analysis.pipCount += pointValue;
                } else if (point.color) {
                    analysis.blots.opponent.push(i);
                    analysis.opponentPipCount += pointValue;
                }
            } else if (point.pieces.length > 1) {
                if (point.color === player) {
                    analysis.points.player.push(i);
                    analysis.pipCount += (point.pieces.length * pointValue);
                } else if (point.color) {
                    analysis.points.opponent.push(i);
                    analysis.opponentPipCount += (point.pieces.length * pointValue);
                }
            }

            // Count pieces in home board
            if (player === 'white' && i < 6 && point.color === player) {
                analysis.piecesInHome += point.pieces.length;
            } else if (player === 'black' && i > 17 && point.color === player) {
                analysis.piecesInHome += point.pieces.length;
            }

            // Count pieces in opponent's home board
            if (player === 'white' && i > 17 && point.color === player) {
                analysis.piecesInOpponentHome += point.pieces.length;
            } else if (player === 'black' && i < 6 && point.color === player) {
                analysis.piecesInOpponentHome += point.pieces.length;
            }
        });

        // Add pip count for pieces on the bar
        if (board.bar[player] && board.bar[player].length > 0) {
            analysis.pipCount += board.bar[player].length * (player === 'white' ? 25 : 24);
        }
        if (board.bar[player === 'white' ? 'black' : 'white'] && board.bar[player === 'white' ? 'black' : 'white'].length > 0) {
            analysis.opponentPipCount += board.bar[player === 'white' ? 'black' : 'white'].length * (player === 'white' ? 24 : 25);
        }

        return analysis;
    }

    function findBarMoves(board, player, dice) {
        const moves = [];
        const usedDice = new Set();
        
        // For each die, check if we can enter from the bar
        dice.forEach(die => {
            // Skip if we've already used this die value (unless it's doubles)
            if (usedDice.has(die) && dice[0] !== dice[1]) return;
            
            const targetPoint = player === 'white' ? 25 - die : die;
            const targetIndex = getIndexFromPoint(targetPoint);
            
            if (targetIndex >= 0 && targetIndex < 24 && 
                (!board.points[targetIndex].color || 
                 board.points[targetIndex].color === player ||
                 board.points[targetIndex].pieces.length === 1)) {
                moves.push(`Die ${die}: Enter from bar to point ${targetPoint}`);
                usedDice.add(die);
            }
        });
        return moves;
    }

    function findBearOffMoves(board, player, dice) {
        const moves = [];
        const homeBoard = player === 'white' ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];
        
        dice.forEach(value => {
            homeBoard.forEach(pointIndex => {
                if (board.points[pointIndex].color === player && board.points[pointIndex].pieces.length > 0) {
                    if ((player === 'white' && pointIndex + 1 === value) ||
                        (player === 'black' && 24 - pointIndex === value)) {
                        moves.push(`Bear off from point ${player === 'white' ? pointIndex + 1 : 24 - pointIndex}`);
                    }
                }
            });
        });
        
        if (moves.length === 0) {
            moves.push("Use larger rolls to bear off from highest points");
        }
        return moves;
    }

    function findHitMoves(board, player, dice) {
        const moves = [];
        const usedDice = new Set();
        
        board.points.forEach((point, i) => {
            if (point.pieces.length === 1 && point.color !== player) {
                dice.forEach(die => {
                    // Skip if we've already used this die value (unless it's doubles)
                    if (usedDice.has(die) && dice[0] !== dice[1]) return;
                    
                    const fromPoint = player === 'white' ? 
                        i + die : 
                        i - die;
                    
                    if (fromPoint >= 0 && fromPoint < 24 && 
                        board.points[fromPoint].color === player) {
                        moves.push(`Die ${die}: Move from point ${player === 'white' ? fromPoint + 1 : 24 - fromPoint} to hit on point ${player === 'white' ? i + 1 : 24 - i}`);
                        usedDice.add(die);
                    }
                });
            }
        });
        return moves;
    }

    function findPointMakingMoves(board, player, dice) {
        const moves = [];
        const usedDice = new Set();
        
        board.points.forEach((point, i) => {
            if (!point.color || point.color === player) {
                dice.forEach(die => {
                    // Skip if we've already used this die value (unless it's doubles)
                    if (usedDice.has(die) && dice[0] !== dice[1]) return;
                    
                    const fromPoint = player === 'white' ? 
                        i + die : 
                        i - die;
                    
                    if (fromPoint >= 0 && fromPoint < 24 && 
                        board.points[fromPoint].color === player &&
                        board.points[fromPoint].pieces.length === 1) {
                        moves.push(`Die ${die}: Move from point ${player === 'white' ? fromPoint + 1 : 24 - fromPoint} to point ${player === 'white' ? i + 1 : 24 - i}`);
                        usedDice.add(die);
                    }
                });
            }
        });
        return moves;
    }

    function findSafeMoves(board, player, dice) {
        const moves = [];
        const usedDice = new Set();
            
        board.points.forEach((point, i) => {
            if (point.color === player && point.pieces.length === 1) {
                dice.forEach(die => {
                    // Skip if we've already used this die value (unless it's doubles)
                    if (usedDice.has(die) && dice[0] !== dice[1]) return;
                    
                    const targetPoint = player === 'white' ? 
                        i - die : 
                        i + die;
                    
                    if (targetPoint >= 0 && targetPoint < 24 && 
                        (!board.points[targetPoint].color || 
                         board.points[targetPoint].color === player)) {
                        moves.push(`Die ${die}: Move from point ${player === 'white' ? i + 1 : 24 - i} to point ${player === 'white' ? targetPoint + 1 : 24 - targetPoint}`);
                        usedDice.add(die);
                    }
                });
            }
        });
        
        return moves;
    }

    function getPointNumber(index) {
        if (index >= 18) {
            return 6 - (index - 18);  // Top right: 6,5,4,3,2,1
        } else if (index >= 12) {
            return 7 + (index - 12);  // Top left: 7,8,9,10,11,12
        } else if (index >= 6) {
            return 13 + (index - 6);  // Bottom left: 13,14,15,16,17,18
        } else {
            return 24 - index;        // Bottom right: 24,23,22,21,20,19
        }
    }

    function getIndexFromPoint(pointNumber) {
        // Convert point number (1-24) to internal index (0-23)
        if (pointNumber <= 6) {
            return 18 + (6 - pointNumber);  // Points 1-6 = indices 23-18
        } else if (pointNumber <= 12) {
            return 12 + (pointNumber - 7);  // Points 7-12 = indices 12-17
        } else if (pointNumber <= 18) {
            return 6 + (pointNumber - 13);  // Points 13-18 = indices 6-11
        } else {
            return pointNumber - 19;        // Points 19-24 = indices 0-5
        }
    }

    function findForwardMoves(board, player, dice, analysis) {
        const moves = [];
        const strategy = analysis.pipCount > analysis.opponentPipCount + 20 ?
            "Back game strategy" :
            analysis.pipCount < analysis.opponentPipCount - 20 ?
            "Running game strategy" :
            "Positional strategy";
            
        // Track which dice have been used
        const usedDice = new Set();
        
        // For each die value, find one valid move
        dice.forEach(die => {
            // Skip if we've already used this die value (unless it's doubles)
            if (usedDice.has(die) && dice[0] !== dice[1]) return;
            
            let foundMove = false;
            board.points.forEach((point, i) => {
                // Skip if we already found a move for this die
                if (foundMove) return;
                
                if (point.color === player && point.pieces.length > 0) {
                    // Calculate target point based on player direction
                    const targetIndex = player === 'white' ? i - die : i + die;
                    
                    if (targetIndex >= 0 && targetIndex < 24 && 
                        (!board.points[targetIndex].color || 
                         board.points[targetIndex].color === player ||
                         board.points[targetIndex].pieces.length === 1)) {
                        
                        // Add context based on the move's strategic value
                        let moveContext = "";
                        if (player === 'white') {
                            if (targetIndex <= 5) moveContext = "into home board";
                            else if (targetIndex <= 11) moveContext = "into outer board";
                        } else {
                            if (targetIndex >= 18) moveContext = "into home board";
                            else if (targetIndex >= 12) moveContext = "into outer board";
                        }
                        
                        // Convert internal indices to point numbers
                        const fromPointNumber = getPointNumber(i);
                        const toPointNumber = getPointNumber(targetIndex);
                        
                        moves.push(`Die ${die}: Move from point ${fromPointNumber} to point ${toPointNumber} ${moveContext}`);
                        foundMove = true;
                        usedDice.add(die);
                    }
                }
            });
        });
        
        return moves.length > 0 ? moves : [`${strategy}: No legal moves available with current dice`];
    }

    function convertToMoveObject(moveDesc, player) {
        // Extract die value and points from the move description
        // Format: "Die X: Move from point Y to point Z"
        if (moveDesc.includes('Move from point')) {
            const dieMatch = moveDesc.match(/Die (\d+):/);
            const pointsMatch = moveDesc.match(/point (\d+) to point (\d+)/);
            
            if (dieMatch && pointsMatch) {
                const dieValue = parseInt(dieMatch[1]);
                const fromPoint = parseInt(pointsMatch[1]);
                const toPoint = parseInt(pointsMatch[2]);
                
                // Convert point numbers to internal indices
                const from = getIndexFromPoint(fromPoint);
                const to = getIndexFromPoint(toPoint);
                
                // Validate that the move matches the die value
                const distance = Math.abs(fromPoint - toPoint);
                if (distance === dieValue) {
                    return { type: 'normal', from, to };
                }
            }
        } else if (moveDesc.includes('Enter from bar')) {
            // Handle bar moves
            // Format: "Die X: Enter from bar to point Y"
            const dieMatch = moveDesc.match(/Die (\d+):/);
            const pointMatch = moveDesc.match(/point (\d+)/);
            
            if (dieMatch && pointMatch) {
                const toPoint = parseInt(pointMatch[1]);
                return {
                    type: 'bar',
                    to: player === 'white' ? toPoint - 1 : 24 - toPoint
                };
            }
        }
        return null;
    }

    function simulateMove(boardState, move, player) {
        // Create a deep copy of the board state
        const newState = JSON.parse(JSON.stringify(boardState));
        
        if (move.type === 'bar') {
            // Remove piece from bar
            newState.bar[player].pop();
            
            // Add to target point
            if (!newState.points[move.to].color) {
                newState.points[move.to].color = player;
                newState.points[move.to].pieces = [player];
            } else if (newState.points[move.to].color === player) {
                newState.points[move.to].pieces.push(player);
            } else if (newState.points[move.to].pieces.length === 1) {
                // Hit opponent's blot
                newState.bar[newState.points[move.to].color].push(newState.points[move.to].color);
                newState.points[move.to].color = player;
                newState.points[move.to].pieces = [player];
            }
        } else if (move.type === 'normal') {
            // Remove piece from source
            newState.points[move.from].pieces.pop();
            if (newState.points[move.from].pieces.length === 0) {
                newState.points[move.from].color = null;
            }
            
            // Add to target point
            if (!newState.points[move.to].color) {
                newState.points[move.to].color = player;
                newState.points[move.to].pieces = [player];
            } else if (newState.points[move.to].color === player) {
                newState.points[move.to].pieces.push(player);
            } else if (newState.points[move.to].pieces.length === 1) {
                // Hit opponent's blot
                newState.bar[newState.points[move.to].color].push(newState.points[move.to].color);
                newState.points[move.to].color = player;
                newState.points[move.to].pieces = [player];
            }
        }
        
        return newState;
    }

    function findSingleMove(boardState, die) {
        // Check bar first
        if (boardState.bar[board.currentPlayer].length > 0) {
            const targetPoint = board.currentPlayer === 'white' ? 25 - die : die;
            const targetIndex = board.getTargetPoint(targetPoint, die);
            
            if (isLegalMove(boardState, 'bar', targetIndex, board.currentPlayer)) {
                return {
                    type: 'bar',
                    to: targetIndex,
                    die: die,
                    description: `Die ${die}: Enter from bar to point ${targetPoint}`
                };
            }
            return null;
        }

        // Get all points with current player's pieces
        let possibleMoves = [];
        boardState.points.forEach((point, fromIndex) => {
            if (point.color === board.currentPlayer && point.pieces.length > 0) {
                // Use board's getTargetPoint method to calculate correct target
                const targetIndex = board.getTargetPoint(fromIndex, die);
                
                if (targetIndex >= 0 && targetIndex < 24 && 
                    isLegalMove(boardState, fromIndex, targetIndex, board.currentPlayer)) {
                    
                    possibleMoves.push({
                        type: 'normal',
                        from: fromIndex,
                        to: targetIndex,
                        die: die,
                        description: `Die ${die}: Move from point ${board.pointNames(fromIndex)} to point ${board.pointNames(targetIndex)}`
                    });
                }
            }
        });

        return possibleMoves.length > 0 ? possibleMoves[0] : null;
    }

    function findMovesSequence(board, player, dice) {
        const sequence = [];
        const boardState = JSON.parse(JSON.stringify(board)); // Deep copy of board state
        
        // For doubles, we need to use the die four times
        const diceToUse = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice;
        
        // Try each die
        diceToUse.forEach(die => {
            const move = findSingleMove(boardState, die);
            if (move) {
                sequence.push(move);
                // Update board state
                if (move.type === 'bar') {
                    boardState.bar[player]--;
                    boardState.points[move.to] = {
                        color: player,
                        pieces: [...(boardState.points[move.to].pieces || []), player]
                    };
                } else {
                    boardState.points[move.from].pieces.pop();
                    if (boardState.points[move.from].pieces.length === 0) {
                        boardState.points[move.from].color = null;
                    }
                    boardState.points[move.to] = {
                        color: player,
                        pieces: [...(boardState.points[move.to].pieces || []), player]
                    };
                }
            }
        });
        
        return sequence;
    }

    function suggestMoves(board, dice) {
        const player = board.currentPlayer;
        
        // Get pip counts directly from the main display
        const whitePips = parseInt(document.getElementById('whitePips').textContent);
        const blackPips = parseInt(document.getElementById('blackPips').textContent);
        
        // Format header with player and dice info
        let output = `${player.toUpperCase()} to play ${dice[0]},${dice[1]}\n`;
        output += '----------------------------------------\n\n';
        
        // Add pip count information using the values from main display
        output += `Current pip counts:\n`;
        output += `White: ${whitePips}\n`;
        output += `Black: ${blackPips}\n\n`;
        
        // Find all possible move sequences using the same logic as the main board
        const moveSequence = findMovesSequence(board, player, dice);
        
        // Store the move sequence for execution
        board.bestMoveSequence = moveSequence;
        
        if (moveSequence.length === 0) {
            output += 'No legal moves available';
            return output;
        }

        // Generate move description
        output += 'Suggested moves:\n';
        moveSequence.forEach((move, index) => {
            output += `${index + 1}. ${move.description}\n`;
        });

        return output;
    }

    // Update the getBestMove method to use the new suggestion system
    board.getBestMove = function(dice) {
        return suggestMoves(this, dice);
    };

    function isLegalMove(boardState, from, to, player) {
        // If moving from bar, only check target point
        if (from === 'bar') {
            if (to < 0 || to >= 24) return false;
            return !boardState.points[to].color || 
                   boardState.points[to].color === player || 
                   boardState.points[to].pieces.length === 1;
        }

        // Check basic bounds
        if (from < 0 || from >= 24 || to < 0 || to >= 24) return false;

        // Verify piece exists and belongs to current player
        if (!boardState.points[from] || 
            boardState.points[from].color !== player || 
            boardState.points[from].pieces.length === 0) {
            return false;
        }

        // Check if target point is available
        return !boardState.points[to].color || 
               boardState.points[to].color === player || 
               boardState.points[to].pieces.length === 1;
    }

    function getMoveContext(targetIndex, player) {
        if (player === 'white' && targetIndex <= 5) return " into home board";
        if (player === 'white' && targetIndex <= 11) return " into outer board";
        if (player === 'black' && targetIndex >= 18) return " into home board";
        if (player === 'black' && targetIndex >= 12) return " into outer board";
        return "";
    }
}); 