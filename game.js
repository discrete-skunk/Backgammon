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
        
        // Get current pip counts
        const whitePips = parseInt(document.getElementById('whitePips').textContent);
        const blackPips = parseInt(document.getElementById('blackPips').textContent);
        const currentPlayer = board.currentPlayer;
        const playerPips = currentPlayer === 'white' ? whitePips : blackPips;
        const opponentPips = currentPlayer === 'white' ? blackPips : whitePips;
        
        // Update modal header with current player
        document.getElementById('pipCounts').textContent = 
            `Current player: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;

        // Format aggressive strategy
        let aggressiveAdvice = `Pip count before: ${playerPips}\n`;
        if (moveInfo.aggressiveStrategy.moves.length > 0) {
            let totalPipReduction = moveInfo.aggressiveStrategy.moves.reduce((total, move) => {
                return total + estimatePipReduction(move, currentPlayer);
            }, 0);
            aggressiveAdvice += `Expected pip count after: ${playerPips - totalPipReduction}\n\n`;
            aggressiveAdvice += moveInfo.aggressiveStrategy.description;
        } else {
            aggressiveAdvice += "\nNo aggressive moves available";
        }

        // Format conservative strategy
        let conservativeAdvice = `Pip count before: ${playerPips}\n`;
        if (moveInfo.conservativeStrategy.moves.length > 0) {
            let totalPipReduction = moveInfo.conservativeStrategy.moves.reduce((total, move) => {
                return total + estimatePipReduction(move, currentPlayer);
            }, 0);
            conservativeAdvice += `Expected pip count after: ${playerPips - totalPipReduction}\n\n`;
            conservativeAdvice += moveInfo.conservativeStrategy.description;
        } else {
            conservativeAdvice += "\nNo conservative moves available";
        }

        document.getElementById('aggressiveAdvice').textContent = aggressiveAdvice;
        document.getElementById('conservativeAdvice').textContent = conservativeAdvice;
        
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
    document.getElementById('executeAggressive').addEventListener('click', () => {
        const die1Value = currentDice[0] || 1;
        const die2Value = currentDice[1] || 1;
        const moveInfo = board.getBestMove([die1Value, die2Value]);
        
        if (moveInfo.aggressiveStrategy.moves.length > 0) {
            const validMoves = moveInfo.aggressiveStrategy.moves.filter(move => move !== null);
            if (validMoves.length > 0) {
                board.bestMoveSequence = validMoves;
                board.executeBestMove();
            }
        }
        modal.style.display = 'none';
    });

    document.getElementById('executeConservative').addEventListener('click', () => {
        const die1Value = currentDice[0] || 1;
        const die2Value = currentDice[1] || 1;
        const moveInfo = board.getBestMove([die1Value, die2Value]);
        
        if (moveInfo.conservativeStrategy.moves.length > 0) {
            const validMoves = moveInfo.conservativeStrategy.moves.filter(move => move !== null);
            if (validMoves.length > 0) {
                board.bestMoveSequence = validMoves;
                board.executeBestMove();
            }
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
        // Convert internal index (0-23) to point number (1-24)
        if (index >= 18) {
            return 6 - (index - 18);  // Top right: indices 18-23 = points 6-1
        } else if (index >= 12) {
            return 7 + (index - 12);  // Top left: indices 12-17 = points 7-12
        } else if (index >= 6) {
            return 13 + (index - 6);  // Bottom left: indices 6-11 = points 13-18
        } else {
            return 19 + index;        // Bottom right: indices 0-5 = points 19-24
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

    function findMovesSequence(board, player, dice) {
        const moves = [];
        const usedDice = new Set();
        let currentBoard = {
            points: board.points.map(p => ({
                color: p.color,
                pieces: [...p.pieces]
            })),
            bar: {
                white: [...board.bar.white],
                black: [...board.bar.black]
            }
        };

        // Function to find a single move given current board state
        function findSingleMove(boardState, die) {
            // Check bar first
            if (boardState.bar[player].length > 0) {
                const targetPoint = player === 'white' ? 25 - die : die;
                const targetIndex = getIndexFromPoint(targetPoint);
                
                if (targetIndex >= 0 && targetIndex < 24 && 
                    (!boardState.points[targetIndex].color || 
                     boardState.points[targetIndex].color === player ||
                     boardState.points[targetIndex].pieces.length === 1)) {
                    return {
                        type: 'bar',
                        to: targetIndex,
                        die: die,
                        description: `Die ${die}: Enter from bar to point ${targetPoint}`
                    };
                }
                return null;
            }

            // Then check regular moves
            let bestMove = null;
            boardState.points.forEach((point, i) => {
                if (point.color === player && point.pieces.length > 0) {
                    const targetIndex = player === 'white' ? i - die : i + die;
                    
                    if (targetIndex >= 0 && targetIndex < 24 && 
                        (!boardState.points[targetIndex].color || 
                         boardState.points[targetIndex].color === player ||
                         boardState.points[targetIndex].pieces.length === 1)) {
                        
                        let moveContext = "";
                        if (player === 'white') {
                            if (targetIndex <= 5) moveContext = "into home board";
                            else if (targetIndex <= 11) moveContext = "into outer board";
                        } else {
                            if (targetIndex >= 18) moveContext = "into home board";
                            else if (targetIndex >= 12) moveContext = "into outer board";
                        }

                        const fromPointNumber = getPointNumber(i);
                        const toPointNumber = getPointNumber(targetIndex);

                        bestMove = {
                            type: 'normal',
                            from: i,
                            to: targetIndex,
                            die: die,
                            description: `Die ${die}: Move from point ${fromPointNumber} to point ${toPointNumber} ${moveContext}`
                        };
                    }
                }
            });
            return bestMove;
        }

        // For each die, find and simulate moves in sequence
        for (let die of dice) {
            if (usedDice.has(die) && dice[0] !== dice[1]) continue;
            
            const move = findSingleMove(currentBoard, die);
            if (move) {
                moves.push(move);
                usedDice.add(die);
                // Simulate the move to update board state for next move
                currentBoard = simulateMove(currentBoard, move, player);
            }
        }

        return moves;
    }

    function suggestMoves(board, dice) {
        const player = board.currentPlayer;
        const analysis = analyzeBoardPosition(board, player);
        const pipCountInfo = `Current pip count - ${player}: ${analysis.pipCount}, opponent: ${analysis.opponentPipCount}`;

        // Find all possible move sequences
        const moveSequence = findMovesSequence(board, player, dice);
        
        if (moveSequence.length === 0) {
            return {
                pipCounts: pipCountInfo,
                aggressiveStrategy: {
                    description: "No legal moves available",
                    moves: []
                },
                conservativeStrategy: {
                    description: "No legal moves available",
                    moves: []
                }
            };
        }

        // Convert moves to proper format and calculate pip reductions
        const moves = moveSequence.map(move => ({
            type: move.type,
            from: move.type === 'normal' ? move.from : 'bar',
            to: move.to
        }));

        const description = moveSequence.map(move => move.description).join('\n');
        const totalPipReduction = moves.reduce((total, move) => 
            total + estimatePipReduction(move, player), 0);

        return {
            pipCounts: pipCountInfo,
            aggressiveStrategy: {
                description: description,
                moves: moves
            },
            conservativeStrategy: {
                description: description,
                moves: moves
            }
        };
    }

    // Update the getBestMove method to use the new suggestion system
    board.getBestMove = function(dice) {
        return suggestMoves(this, dice);
    };
}); 