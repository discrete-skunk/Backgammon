class BackgammonBoard {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = Array(24).fill().map(() => ({ pieces: [], color: null }));
        this.bar = { white: [], black: [] };  // Add bar to hold hit pieces
        this.selectedPiece = null;
        this.isDragging = false;
        this.currentPlayer = 'white'; // Add current player tracking
        this.bestMoveSequence = null;  // Store the best move sequence
        
        // Initialize starting position
        this.initializeBoard();
        
        // Mouse event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Touch event listeners
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: (touch.clientX - rect.left) * scaleX,
                clientY: (touch.clientY - rect.top) * scaleY
            });
            this.handleMouseDown(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: (touch.clientX - rect.left) * scaleX,
                clientY: (touch.clientY - rect.top) * scaleY
            });
            this.handleMouseMove(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                
                const mouseEvent = new MouseEvent('mouseup', {
                    clientX: (touch.clientX - rect.left) * scaleX,
                    clientY: (touch.clientY - rect.top) * scaleY
                });
                this.handleMouseUp(mouseEvent);
            }
        });

        // Initial pip count
        this.updatePipCounts();
    }

    initializeBoard() {
        // Set up initial piece positions
        const initialPositions = {
            0: { count: 5, color: 'black' },   // Point 24 (bottom right)
            5: { count: 2, color: 'white' },   // Point 19 (bottom right)
            7: { count: 3, color: 'black' },   // Point 17 (bottom left)
            11: { count: 5, color: 'white' },  // Point 13 (bottom left)
            17: { count: 5, color: 'black' },  // Point 7 (top left)
            13: { count: 3, color: 'white' },  // Point 11 (top left)
            18: { count: 5, color: 'white' },  // Point 6 (top right)
            23: { count: 2, color: 'black' }   // Point 1 (top right)
        };

        Object.entries(initialPositions).forEach(([point, setup]) => {
            for (let i = 0; i < setup.count; i++) {
                this.points[point].pieces.push(setup.color);
                this.points[point].color = setup.color;
            }
        });

        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board background
        this.ctx.fillStyle = '#8B4513';  // Classic wooden brown
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw border
        this.ctx.strokeStyle = '#4A2511';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);

        // Calculate dimensions
        const centerX = this.canvas.width / 2;
        const barWidth = 60;
        const quadrantWidth = (this.canvas.width - barWidth - 40) / 2;  // Add padding
        const pointWidth = quadrantWidth / 6;
        const pointHeight = (this.canvas.height - 80) / 2;
        const padding = 40;

        // Draw center bar
        this.ctx.fillStyle = '#4A2511';
        this.ctx.fillRect(centerX - barWidth/2, 0, barWidth, this.canvas.height);
        
        // Draw points
        for (let i = 0; i < 24; i++) {
            let x;
            
            if (i < 6) {
                // Bottom right quadrant (points 19-24)
                x = centerX + barWidth/2 + i * pointWidth;
            } else if (i < 12) {
                // Bottom left quadrant (points 13-18)
                x = (11 - i) * pointWidth + 20;  // Start from right edge with padding
            } else if (i < 18) {
                // Top left quadrant (points 7-12)
                x = (17 - i) * pointWidth + 20;  // Start from right edge with padding
            } else {
                // Top right quadrant (points 1-6)
                x = centerX + barWidth/2 + (i - 18) * pointWidth;
            }
            
            const y = i < 12 ? this.canvas.height - padding : padding;
            
            // Draw triangle
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + pointWidth, y);
            this.ctx.lineTo(x + pointWidth/2, i < 12 ? y - pointHeight : y + pointHeight);
            this.ctx.closePath();
            
            // Get point number (1-24) to determine color
            let pointNumber;
            if (i >= 18) {
                pointNumber = 6 - (i - 18);  // Top right: 6,5,4,3,2,1
            } else if (i >= 12) {
                pointNumber = 7 + (i - 12);  // Top left: 7,8,9,10,11,12
            } else if (i >= 6) {
                pointNumber = 18 - (i - 6);   // Bottom left: 18,17,16,15,14,13
            } else {
                pointNumber = 19 + i;  // Bottom right: 19,20,21,22,23,24
            }
            
            // Alternate colors based on point number
            this.ctx.fillStyle = (pointNumber % 2 === 1) ? '#E8C17D' : '#A0522D';
            
            this.ctx.fill();
            
            // Draw point number
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            
            const textY = i < 12 ? this.canvas.height - 5 : 15;
            this.ctx.fillText(pointNumber.toString(), x + pointWidth/2, textY);
            
            // Draw pieces
            this.drawPieces(i, x, y, pointWidth, pointHeight);
        }

        // Draw pieces on the bar
        this.drawBar(centerX, barWidth);

        this.updatePipCounts();
    }

    drawPiece(x, y, radius, color) {
        // Draw main piece
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Draw outer ring
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = color === 'white' ? '#000' : '#333';
        this.ctx.stroke();
        
        // Draw inner detail
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        this.ctx.strokeStyle = color === 'white' ? '#DDD' : '#666';
        this.ctx.stroke();
    }

    drawBar(centerX, barWidth) {
        const pieceRadius = barWidth * 0.4;
        const spacing = pieceRadius * 2.2;
        const startY = this.canvas.height / 2;

        // Draw white pieces on bottom half of bar
        this.bar.white.forEach((_, index) => {
            const y = startY + spacing * index + pieceRadius;
            this.drawPiece(centerX, y, pieceRadius, 'white');
        });

        // Draw black pieces on top half of bar
        this.bar.black.forEach((_, index) => {
            const y = startY - spacing * index - pieceRadius;
            this.drawPiece(centerX, y, pieceRadius, 'black');
        });
    }

    drawPieces(pointIndex, x, y, pointWidth, pointHeight) {
        const point = this.points[pointIndex];
        const pieceRadius = pointWidth * 0.4;
        const spacing = pieceRadius * 1.8;
        
        point.pieces.forEach((color, pieceIndex) => {
            const pieceX = x + pointWidth/2;
            const maxPiecesInColumn = Math.floor(pointHeight / spacing);
            
            let pieceY;
            if (pointIndex < 12) {
                pieceY = y - pieceRadius - (pieceIndex * spacing);
            } else {
                pieceY = y + pieceRadius + (pieceIndex * spacing);
            }
            
            this.drawPiece(pieceX, pieceY, pieceRadius, color);
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on the bar
        const centerX = this.canvas.width / 2;
        const barWidth = 40;
        if (x >= centerX - barWidth/2 && x <= centerX + barWidth/2) {
            const piece = this.getBarPiece(x, y);
            if (piece) {
                this.selectedPiece = { isOnBar: true, color: piece };
                this.isDragging = true;
                return;
            }
        }
        
        // Check regular points
        const pointIndex = this.getPointFromCoordinates(x, y);
        if (pointIndex !== -1 && this.points[pointIndex].pieces.length > 0) {
            this.selectedPiece = {
                pointIndex,
                color: this.points[pointIndex].pieces[this.points[pointIndex].pieces.length - 1],
                isOnBar: false
            };
            this.isDragging = true;
        }
    }

    getBarPiece(x, y) {
        const centerY = this.canvas.height / 2;
        if (y > centerY && this.bar.white.length > 0) return 'white';
        if (y < centerY && this.bar.black.length > 0) return 'black';
        return null;
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            this.draw();
            
            // Draw dragged piece
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 20, 0, Math.PI * 2);
            this.ctx.fillStyle = this.selectedPiece.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.stroke();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = this.canvas.width / 2;
            const barWidth = 40;
            const isOnBar = x >= centerX - barWidth/2 && x <= centerX + barWidth/2;
            const targetPoint = this.getPointFromCoordinates(x, y);
            
            // Check if target point has more than one opponent piece
            const hasMultipleOpponentPieces = targetPoint !== -1 && 
                this.points[targetPoint].color !== this.selectedPiece.color && 
                this.points[targetPoint].pieces.length > 1;

            if (hasMultipleOpponentPieces) {
                // Invalid move - return piece to original position
                this.isDragging = false;
                this.selectedPiece = null;
                this.draw();
                return;
            }

            if (isOnBar && !this.selectedPiece.isOnBar) {
                // Dropping piece onto the bar
                this.points[this.selectedPiece.pointIndex].pieces.pop();
                if (this.points[this.selectedPiece.pointIndex].pieces.length === 0) {
                    this.points[this.selectedPiece.pointIndex].color = null;
                }
                this.bar[this.selectedPiece.color].push(this.selectedPiece.color);
            } else if (targetPoint !== -1) {
                if (this.selectedPiece.isOnBar) {
                    // Remove from bar and add to point
                    const barArray = this.bar[this.selectedPiece.color];
                    if (barArray.length > 0) {
                        barArray.pop();
                        if (this.points[targetPoint].pieces.length === 1 && 
                            this.points[targetPoint].color !== this.selectedPiece.color) {
                            // Hit opponent's blot
                            const hitColor = this.points[targetPoint].color;
                            this.points[targetPoint].pieces.pop();
                            this.bar[hitColor].push(hitColor);
                        }
                        this.points[targetPoint].pieces.push(this.selectedPiece.color);
                        this.points[targetPoint].color = this.selectedPiece.color;
                    }
                } else if (targetPoint !== this.selectedPiece.pointIndex) {
                    // Regular point-to-point move
                    this.points[this.selectedPiece.pointIndex].pieces.pop();
                    if (this.points[this.selectedPiece.pointIndex].pieces.length === 0) {
                        this.points[this.selectedPiece.pointIndex].color = null;
                    }
                    
                    if (this.points[targetPoint].pieces.length === 1 && 
                        this.points[targetPoint].color !== this.selectedPiece.color) {
                        // Hit opponent's blot
                        const hitColor = this.points[targetPoint].color;
                        this.points[targetPoint].pieces.pop();
                        this.bar[hitColor].push(hitColor);
                    }
                    
                    this.points[targetPoint].pieces.push(this.selectedPiece.color);
                    this.points[targetPoint].color = this.selectedPiece.color;
                }
            }
            
            this.isDragging = false;
            this.selectedPiece = null;
            this.draw();
        }
    }

    getPointFromCoordinates(x, y) {
        const centerX = this.canvas.width / 2;
        const barWidth = 60;
        const quadrantWidth = (this.canvas.width - barWidth - 40) / 2;
        const pointWidth = quadrantWidth / 6;
        
        // Check if clicking on the bar
        if (x >= centerX - barWidth/2 && x <= centerX + barWidth/2) {
            return -1;
        }
        
        // Determine which quadrant we're in
        const isLeftSide = x < centerX - barWidth/2;
        const isTopHalf = y < this.canvas.height / 2;

        if (isLeftSide) {
            // Left side of board
            const relativeX = x - 20;  // Adjust for padding
            const column = Math.floor(relativeX / pointWidth);
            if (column < 0 || column > 5) return -1;
            
            if (isTopHalf) {
                // Top left quadrant (points 7-12)
                return 12 + (5 - column);  // Maps 5-0 to indices 17-12 (right to left)
            } else {
                // Bottom left quadrant (points 13-18)
                return 11 - column;   // Maps 5-0 to indices 6-11 (right to left)
            }
        } else {
            // Right side of board
            const relativeX = x - (centerX + barWidth/2);
            const column = Math.floor(relativeX / pointWidth);
            if (column < 0 || column > 5) return -1;
            
            if (isTopHalf) {
                // Top right quadrant (points 1-6)
                return 18 + column;   // Maps 0-5 to indices 18-23 (left to right)
            } else {
                // Bottom right quadrant (points 19-24)
                return column;        // Maps 0-5 to indices 0-5 (left to right)
            }
        }
    }

    togglePlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    }

    pointNames(index) {
        if (index === 'bar') return 'bar';
        if (index < 0) return "off the board";
        if (index > 23) return "off the board";
        
        // Convert internal point index to actual point number (24-1 clockwise)
        let pointNumber;
        if (index >= 18) {
            pointNumber = 6 - (index - 18);  // Top right: 6,5,4,3,2,1
        } else if (index >= 12) {
            pointNumber = 7 + (index - 12);  // Top left: 7,8,9,10,11,12
        } else if (index >= 6) {
            pointNumber = 18 - (index - 6);   // Bottom left: 18,17,16,15,14,13
        } else {
            pointNumber = 19 + index;  // Bottom right: 19,20,21,22,23,24
        }
        return `point ${pointNumber}`;
    }

    canBearOff(player) {
        // Check if all pieces are in home board
        const startIndex = player === 'white' ? 18 : 0;
        const endIndex = player === 'white' ? 23 : 5;
        
        // First check if any pieces are on the bar
        if (this.bar[player].length > 0) {
            return false;
        }
        
        // Then check if any pieces are outside home board
        for (let i = 0; i < 24; i++) {
            if (this.points[i].color === player && this.points[i].pieces.length > 0) {
                if (player === 'white' && i < 18) {
                    return false;
                }
                if (player === 'black' && i > 5) {
                    return false;
                }
            }
        }
        return true;
    }

    isLegalMove(from, to, die) {
        // Check basic bounds
        if (from < 0 || from > 23) return false;

        // Verify piece exists and belongs to current player
        if (!this.points[from] || 
            this.points[from].color !== this.currentPlayer || 
            this.points[from].pieces.length === 0) {
            return false;
        }

        // Handle bearing off
        if (this.currentPlayer === 'white' && to > 23) {
            if (!this.canBearOff('white')) return false;
            // Can only bear off if exact or higher die when piece is on highest possible point
            if (from < 18) return false; // Not in home board
            if (24 - from === die) return true; // Exact roll
            // Check if it's a higher roll and no pieces are further from bearing off
            if (die > 24 - from) {
                for (let i = from - 1; i >= 18; i--) {
                    if (this.points[i].color === 'white' && this.points[i].pieces.length > 0) return false;
                }
                return true;
            }
            return false;
        }

        if (this.currentPlayer === 'black' && to < 0) {
            if (!this.canBearOff('black')) return false;
            if (from > 5) return false; // Not in home board
            if (from + 1 === die) return true; // Exact roll
            // Check if it's a higher roll and no pieces are further from bearing off
            if (die > from + 1) {
                for (let i = from + 1; i < 6; i++) {
                    if (this.points[i].color === 'black' && this.points[i].pieces.length > 0) return false;
                }
                return true;
            }
            return false;
        }

        // Normal move checks
        if (to < 0 || to > 23) return false;

        // Check if target point is available:
        // - Empty point is always legal
        // - Point with same color pieces is legal
        // - Point with single opponent piece (blot) is legal
        // - Point with multiple opponent pieces is NOT legal
        if (this.points[to].pieces.length === 0) return true;
        if (this.points[to].color === this.currentPlayer) return true;
        if (this.points[to].pieces.length === 1) return true;
        return false;  // Point has multiple opponent pieces
    }

    makeMove(boardState, from, to) {
        const newState = JSON.parse(JSON.stringify(boardState));
        
        // Only proceed if there are pieces to move
        if (newState[from].count > 0) {
            // Remove piece from source
            newState[from].count--;
            if (newState[from].count === 0) {
                newState[from].color = null;
            }
            
            // If not bearing off, update target point
            if (to >= 0 && to <= 23) {
                // Handle hitting a blot
                if (newState[to].count === 1 && newState[to].color !== this.currentPlayer) {
                    newState[to].count = 1;
                    newState[to].color = this.currentPlayer;
                } else {
                    // Regular move
                    newState[to].count = (newState[to].count || 0) + 1;
                    newState[to].color = this.currentPlayer;
                }
            }
        }
        
        return newState;
    }

    getTargetPoint(fromIndex, die) {
        const fromPoint = parseInt(this.pointNames(fromIndex).split(' ')[1]);
        if (this.currentPlayer === 'white') {
            // White moves clockwise (decreasing point numbers)
            const targetPoint = fromPoint - die;
            if (targetPoint < 1) return 24; // Bearing off
            // Convert point number back to index
            for (let i = 0; i < 24; i++) {
                if (parseInt(this.pointNames(i).split(' ')[1]) === targetPoint) {
                    return i;
                }
            }
        } else {
            // Black moves counterclockwise (increasing point numbers)
            const targetPoint = fromPoint + die;
            if (targetPoint > 24) return -1; // Bearing off
            // Convert point number back to index
            for (let i = 0; i < 24; i++) {
                if (parseInt(this.pointNames(i).split(' ')[1]) === targetPoint) {
                    return i;
                }
            }
        }
        return -1; // Invalid move
    }

    getBestMove(dice) {
        // Convert the current board state to a simpler format for analysis
        const board = this.points.map(point => ({
            color: point.color,
            count: point.pieces.length
        }));

        // Calculate initial pip count
        let initialWhitePips = 0;
        let initialBlackPips = 0;
        this.points.forEach((point, index) => {
            const pointNumber = parseInt(this.pointNames(index).split(' ')[1]);
            point.pieces.forEach(color => {
                if (color === 'white') {
                    initialWhitePips += pointNumber;
                } else {
                    initialBlackPips += (25 - pointNumber);
                }
            });
        });
        initialWhitePips += this.bar.white.length * 24;
        initialBlackPips += this.bar.black.length * 24;

        // Check if there are pieces on the bar
        if (this.bar[this.currentPlayer].length > 0) {
            // Must move pieces from the bar first
            const moves = [];
            const usedDice = new Set();

            dice.forEach(die => {
                if (usedDice.has(die)) return;
                
                let targetPoint;
                if (this.currentPlayer === 'white') {
                    // For white, entering from bar is like moving from point 25
                    // So with die 1, we can move to point 24, with die 2 to point 23, etc.
                    targetPoint = 24 - die;
                } else {
                    // For black, entering from bar is like moving from point 0
                    // So with die 1, we can move to point 1, with die 2 to point 2, etc.
                    targetPoint = die;
                }

                // Convert target point number to index
                let targetIndex = -1;
                for (let i = 0; i < 24; i++) {
                    if (parseInt(this.pointNames(i).split(' ')[1]) === targetPoint) {
                        targetIndex = i;
                        break;
                    }
                }

                if (targetIndex >= 0 && targetIndex <= 23 &&
                    (board[targetIndex].count === 0 || 
                     board[targetIndex].color === this.currentPlayer ||
                     board[targetIndex].count === 1)) {
                    moves.push({
                        from: 'bar',
                        to: targetIndex,
                        die: die
                    });
                    usedDice.add(die);
                }
            });

            if (moves.length === 0) {
                return "No legal moves available. Must move pieces from the bar first.";
            }

            let advice = `Must move from bar first:\n\n`;
            moves.forEach((move, index) => {
                advice += `${index + 1}. Move from bar to ${this.pointNames(move.to)}`;
                if (board[move.to].count === 1 && board[move.to].color !== this.currentPlayer) {
                    advice += " (sends opponent piece to the bar)";
                }
                advice += "\n";
            });

            // Store the best sequence for later execution
            this.bestMoveSequence = moves;

            return advice;
        }

        // Regular move logic
        const isDouble = dice[0] === dice[1];
        const diceValues = isDouble ? Array(4).fill(dice[0]) : [...dice];

        // Helper function to calculate pip reduction for a move
        const getPipReduction = (from, to) => {
            if (to < 0 || to > 23) return from + 1; // Bearing off
            const fromPoint = this.pointNames(from).split(' ')[1];
            const toPoint = this.pointNames(to).split(' ')[1];
            return Math.abs(parseInt(fromPoint) - parseInt(toPoint));
        };

        // Find all possible move sequences
        const findMoveSequences = (remainingDice, currentBoard, sequence = []) => {
            if (remainingDice.length === 0) return [sequence];
            
            const sequences = [];
            const playerPieces = currentBoard.map((point, index) => ({
                index,
                count: point.color === this.currentPlayer ? point.count : 0
            })).filter(point => point.count > 0);

            playerPieces.forEach(from => {
                const die = remainingDice[0];
                const to = this.getTargetPoint(from.index, die);
                
                // Check if move is legal and target point doesn't have multiple opponent pieces
                if (to !== -1 && 
                    this.isLegalMove(from.index, to, die) && 
                    (currentBoard[to].color === this.currentPlayer || 
                     currentBoard[to].count <= 1)) {
                    const newBoard = this.makeMove(currentBoard, from.index, to);
                    const newSequences = findMoveSequences(
                        remainingDice.slice(1),
                        newBoard,
                        [...sequence, { from: from.index, to, die }]
                    );
                    sequences.push(...newSequences);
                }
            });

            return sequences.length > 0 ? sequences : [sequence];
        };

        // Evaluate move sequences
        const evaluateSequence = (sequence, currentBoard) => {
            let score = 0;
            let boardState = {...currentBoard};
            
            sequence.forEach(move => {
                // Calculate pip reduction
                const pipReduction = getPipReduction(move.from, move.to);
                score += pipReduction * 2;

                // Bearing off is highest priority
                if ((this.currentPlayer === 'white' && move.to > 23) ||
                    (this.currentPlayer === 'black' && move.to < 0)) {
                    score += 15;
                } else {
                    // Prefer moves that create a safe position (2 or more pieces)
                    if (boardState[move.to] && 
                        boardState[move.to].color === this.currentPlayer && 
                        boardState[move.to].count >= 1) {
                        score += 5;
                    }
                    
                    // Prefer moves that hit single opponent pieces
                    if (boardState[move.to] && 
                        boardState[move.to].color !== this.currentPlayer && 
                        boardState[move.to].count === 1) {
                        score += 8;
                    }
                    
                    // Prefer moves that protect single pieces
                    if (boardState[move.from] && boardState[move.from].count === 1) {
                        score += 3;
                    }
                }
                
                boardState = this.makeMove(boardState, move.from, move.to);
            });
            
            return score;
        };

        // Get all possible move sequences
        const moveSequences = findMoveSequences(diceValues, board);

        if (moveSequences.length === 0 || moveSequences[0].length === 0) {
            return "No legal moves available with these dice.";
        }

        // Find best sequence
        const bestSequence = moveSequences.reduce((best, sequence) => {
            const score = evaluateSequence(sequence, board);
            return score > best.score ? { sequence, score } : best;
        }, { score: -Infinity }).sequence;

        // Calculate final pip count after moves by simulating the moves
        let finalBoard = JSON.parse(JSON.stringify(board));
        bestSequence.forEach(move => {
            finalBoard = this.makeMove(finalBoard, move.from, move.to);
        });

        // Calculate final pips using same logic as updatePipCounts
        let finalPips = 0;
        finalBoard.forEach((point, index) => {
            if (point.color === this.currentPlayer) {
                const pointNumber = parseInt(this.pointNames(index).split(' ')[1]);
                if (this.currentPlayer === 'white') {
                    finalPips += pointNumber * point.count;
                } else {
                    finalPips += (25 - pointNumber) * point.count;
                }
            }
        });

        // Add bar pieces to final count
        finalPips += this.bar[this.currentPlayer].length * 24;

        // Calculate pip reduction
        const initialPips = this.currentPlayer === 'white' ? initialWhitePips : initialBlackPips;
        const pipReduction = Math.max(0, initialPips - finalPips); // Ensure non-negative

        // Generate advice text
        let advice = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} to play ${isDouble ? `double ${dice[0]}s` : `${dice[0]},${dice[1]}`}\n`;
        advice += `------------------------------------------\n\n`;
        advice += `Starting pip count: ${initialPips}\n\n`;
        advice += `Suggested moves:\n`;

        bestSequence.forEach((move, index) => {
            advice += `${index + 1}. Move from ${this.pointNames(move.from)} to ${this.pointNames(move.to)}`;
            if (move.to >= 0 && move.to <= 23) {
                if (board[move.to].count === 1 && board[move.to].color !== this.currentPlayer) {
                    advice += " (sends opponent piece to the bar)";
                } else if (board[move.to].color === this.currentPlayer && board[move.to].count >= 1) {
                    advice += " (creates a safe position with multiple pieces)";
                }
            } else {
                advice += " (bears off)";
            }
            advice += "\n";
        });

        advice += `\n------------------------------------------\n`;
        advice += `Final pip count: ${finalPips}\n`;
        advice += `Pip reduction: ${pipReduction}`;

        // Store the best sequence for later execution
        this.bestMoveSequence = bestSequence;

        return advice;
    }

    updatePipCounts() {
        let whitePips = 0;
        let blackPips = 0;

        // Helper function to convert index to point number (1-24)
        const getPointNumber = (index) => {
            if (index >= 18) {
                return 6 - (index - 18);  // Top right: 6,5,4,3,2,1
            } else if (index >= 12) {
                return 7 + (index - 12);  // Top left: 7,8,9,10,11,12
            } else if (index >= 6) {
                return 18 - (index - 6);   // Bottom left: 18,17,16,15,14,13
            } else {
                return 19 + index;  // Bottom right: 19,20,21,22,23,24
            }
        };

        this.points.forEach((point, index) => {
            const pointNumber = getPointNumber(index);
            point.pieces.forEach(color => {
                if (color === 'white') {
                    whitePips += pointNumber;  // Distance from bearing off (point 0)
                } else {
                    blackPips += (25 - pointNumber);  // Distance from point 1 (25 - point number)
                }
            });
        });

        // Add pips for pieces on the bar
        whitePips += this.bar.white.length * 24;  // From bar to point 24
        blackPips += this.bar.black.length * 24;  // From bar to point 1

        document.getElementById('whitePips').textContent = whitePips;
        document.getElementById('blackPips').textContent = blackPips;
    }

    executeBestMove() {
        if (!this.bestMoveSequence) return;

        // Execute each move in the sequence
        this.bestMoveSequence.forEach(move => {
            if (move.from === 'bar') {
                // Move from bar
                this.bar[this.currentPlayer].pop();
                if (this.points[move.to].pieces.length === 1 && 
                    this.points[move.to].color !== this.currentPlayer) {
                    // Hit opponent's blot
                    const hitColor = this.points[move.to].color;
                    this.points[move.to].pieces.pop();
                    this.bar[hitColor].push(hitColor);
                }
                this.points[move.to].pieces.push(this.currentPlayer);
                this.points[move.to].color = this.currentPlayer;
            } else {
                // Regular move
                this.points[move.from].pieces.pop();
                if (this.points[move.from].pieces.length === 0) {
                    this.points[move.from].color = null;
                }

                if (move.to >= 0 && move.to <= 23) {
                    if (this.points[move.to].pieces.length === 1 && 
                        this.points[move.to].color !== this.currentPlayer) {
                        // Hit opponent's blot
                        const hitColor = this.points[move.to].color;
                        this.points[move.to].pieces.pop();
                        this.bar[hitColor].push(hitColor);
                    }
                    this.points[move.to].pieces.push(this.currentPlayer);
                    this.points[move.to].color = this.currentPlayer;
                }
                // If move.to is outside the board, the piece is being borne off
            }
        });

        // Clear the best move sequence
        this.bestMoveSequence = null;

        // Toggle player
        this.togglePlayer();

        // Redraw board and close modal
        this.draw();
        document.getElementById('moveModal').style.display = 'none';
    }

    movePiece(fromPoint, toPoint) {
        // Validate points are in range
        if (fromPoint < 0 || fromPoint >= 24 || toPoint < 0 || toPoint >= 24) {
            return false;
        }

        // Check if there's a piece to move
        if (!this.points[fromPoint].pieces.length || 
            this.points[fromPoint].color !== this.currentPlayer) {
            return false;
        }

        // If target point is empty or same color, or has only one opponent piece
        if (!this.points[toPoint].color || 
            this.points[toPoint].color === this.currentPlayer ||
            (this.points[toPoint].color !== this.currentPlayer && 
             this.points[toPoint].pieces.length === 1)) {

            // If hitting an opponent's blot
            if (this.points[toPoint].color !== this.currentPlayer && 
                this.points[toPoint].pieces.length === 1) {
                // Move opponent's piece to the bar
                this.bar[this.points[toPoint].color].push(this.points[toPoint].pieces.pop());
            }

            // Move the piece
            this.points[fromPoint].pieces.pop();
            if (this.points[fromPoint].pieces.length === 0) {
                this.points[fromPoint].color = null;
            }

            this.points[toPoint].pieces.push(this.currentPlayer);
            this.points[toPoint].color = this.currentPlayer;

            this.draw();
            return true;
        }

        return false;
    }

    moveFromBar(toPoint) {
        // Validate point is in range
        if (toPoint < 0 || toPoint >= 24) {
            return false;
        }

        // Check if there are pieces on the bar
        if (!this.bar[this.currentPlayer].length) {
            return false;
        }

        // If target point is empty or same color, or has only one opponent piece
        if (!this.points[toPoint].color || 
            this.points[toPoint].color === this.currentPlayer ||
            (this.points[toPoint].color !== this.currentPlayer && 
             this.points[toPoint].pieces.length === 1)) {

            // If hitting an opponent's blot
            if (this.points[toPoint].color !== this.currentPlayer && 
                this.points[toPoint].pieces.length === 1) {
                // Move opponent's piece to the bar
                this.bar[this.points[toPoint].color].push(this.points[toPoint].pieces.pop());
            }

            // Move the piece from bar
            this.bar[this.currentPlayer].pop();
            this.points[toPoint].pieces.push(this.currentPlayer);
            this.points[toPoint].color = this.currentPlayer;

            this.draw();
            return true;
        }

        return false;
    }
} 