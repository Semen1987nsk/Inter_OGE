/**
 * SpringView - Handles all rendering logic for the Spring Experiment
 */
export class SpringView {
    constructor(experiment) {
        this.experiment = experiment;
        this.contexts = experiment.contexts;
        this.canvases = experiment.canvases;
        this.images = experiment.images;
        this.visual = experiment.visual;
        
        // Helper to access state safely
        this.getState = () => experiment.model ? experiment.model.state : experiment.state;
    }

    /**
     * Main render loop for dynamic elements
     * @param {boolean} isOverloaded 
     */
    drawDynamic(isOverloaded = false) {
        const ctx = this.contexts.dynamic;
        const state = this.getState();
        
        // Full clear with context save
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        // 1. Draw Dynamometer if attached
        if (state.dynamometerAttached) {
            this.drawDynamometerSetup(ctx);
            return;
        }

        // 2. Draw Spring Placeholder if no spring attached
        if (!state.springAttached) {
            this.drawSpringPlaceholder(ctx);
            return;
        }

        // 3. Draw Spring Setup
        const anchor = this.experiment.getSpringAnchor();
        const physicalLength = state.springLength || state.springNaturalLength;
        const length = this.experiment.getVisualLength(physicalLength);
        const coils = 14;
        const wireRadius = 5;
        const springRadius = 22;

        // Equipment Label
        this.drawEquipmentLabel(ctx, anchor.x, anchor.y - 35);

        // Optimization: Check if spring cache needs update
        const springCache = this.experiment.springCache;
        if (springCache.needsUpdate || 
            springCache.lastLength !== length || 
            springCache.lastCoils !== coils ||
            springCache.lastOverloaded !== isOverloaded) {
            
            // Redraw spring to offscreen canvas
            const cacheCtx = springCache.ctx;
            cacheCtx.clearRect(0, 0, springCache.canvas.width, springCache.canvas.height);
            
            // Draw coils centered in offscreen canvas
            const cacheAnchor = { x: 100, y: 50 };
            this.drawSpringCoils(cacheCtx, cacheAnchor, length, coils, springRadius, wireRadius, isOverloaded);
            this.drawTopHook(cacheCtx, cacheAnchor.x, cacheAnchor.y, wireRadius, isOverloaded);
            this.drawBottomHook(cacheCtx, cacheAnchor.x, cacheAnchor.y + length, wireRadius, isOverloaded);
            
            // Update cache metadata
            springCache.lastLength = length;
            springCache.lastCoils = coils;
            springCache.lastOverloaded = isOverloaded;
            springCache.needsUpdate = false;
        }
        
        // Draw cached spring
        ctx.drawImage(
            springCache.canvas,
            0, 0, 200, length + 100, // Source
            anchor.x - 100, anchor.y - 50, 200, length + 100 // Destination
        );

        // Attached Weights
        this.drawAttachedWeights(ctx, anchor.x, anchor.y + length);
        
        // Ruler
        this.drawRuler(ctx, anchor.x + 80, anchor.y, physicalLength);
        
        // Free Weights
        this.drawFreeWeights(ctx);
        
        // Snap Zones
        this.drawSnapZones(ctx, anchor.x, anchor.y + length);
    }

    drawSnapZones(ctx, springBottomHookX, springBottomHookY) {
        const state = this.getState();
        const draggedWeight = state.freeWeights?.find(w => w.isDragging);
        
        if (draggedWeight) {
            // Calculate distance for snap feedback
            const weightDef = this.experiment.getWeightById(draggedWeight.weightId);
            const img = weightDef ? (this.images.weights[draggedWeight.weightId] || this.images.weights[weightDef.id]) : null;
            const targetSize = weightDef?.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            const weightTopHookX = draggedWeight.x;
            const weightTopHookY = draggedWeight.y - renderedHeight/2 - 12;
            
            const distance = Math.hypot(weightTopHookX - springBottomHookX, weightTopHookY - springBottomHookY);
            const isSnapped = distance < 100;

            ctx.save();
            
            if (isSnapped) {
                // Strong snap feedback
                ctx.strokeStyle = 'rgba(50, 255, 50, 1.0)';
                ctx.lineWidth = 5;
                ctx.setLineDash([]); // Solid line
                ctx.fillStyle = 'rgba(50, 255, 50, 0.3)';
                
                // Draw anchor icon
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.fillText('⚓', springBottomHookX, springBottomHookY);
                ctx.fillStyle = 'rgba(50, 255, 50, 0.3)'; // Restore fill style
            } else {
                // Weak feedback
                ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
            }
            
            // Green circle around bottom hook
            ctx.beginPath();
            ctx.arc(springBottomHookX, springBottomHookY, 100, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawFreeWeights(ctx) {
        const state = this.getState();
        if (!state.freeWeights || state.freeWeights.length === 0) return;
        
        state.freeWeights.forEach(weight => {
            const weightDef = this.experiment.getWeightById(weight.weightId);
            if (!weightDef) return;
            
            const img = this.images.weights[weight.weightId] || this.images.weights[weightDef.id];
            const targetSize = weightDef.targetSize ?? 72;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            ctx.save();
            
            // Check proximity to other weights
            let nearOtherWeight = false;
            if (weight.isDragging) {
                for (let other of state.freeWeights) {
                    if (other === weight) continue;
                    if (this.experiment.canStackWeights(other, weight)) {
                        nearOtherWeight = true;
                        break;
                    }
                }
            }
            
            // Highlight when dragging
            if (weight.isDragging) {
                if (nearOtherWeight) {
                    ctx.shadowColor = 'rgba(0, 255, 100, 0.9)';
                    ctx.shadowBlur = 30;
                } else {
                    ctx.shadowColor = 'rgba(0, 150, 255, 0.8)';
                    ctx.shadowBlur = 25;
                }
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
            }
            
            // Draw weight
            if (img) {
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.translate(weight.x, weight.y);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
                this.drawWeightPlaceholder(ctx, weight.x, weight.y, targetSize, renderedHeight, 0);
            }
            
            ctx.restore();
            
            // Draw hooks and snap zones
            if (weight.isDragging) {
                ctx.save();
                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                // Top hook
                const topHookY = weight.y - renderedHeight/2 - 12;
                ctx.beginPath();
                ctx.arc(weight.x, topHookY, 8, 0, Math.PI * 2);
                ctx.stroke();
                
                // Bottom hook
                const bottomHookY = weight.y + renderedHeight/2 + 8;
                ctx.beginPath();
                ctx.arc(weight.x, bottomHookY, 8, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }
            
            // Draw snap zones for other weights
            if (!weight.isDragging) {
                ctx.save();
                
                let showSnapZone = false;
                for (let other of state.freeWeights) {
                    if (!other.isDragging) continue;
                    if (this.experiment.canStackWeights(weight, other)) {
                        showSnapZone = true;
                        break;
                    }
                }
                
                if (showSnapZone) {
                    const bottomHookY = weight.y + renderedHeight/2 + 8;
                    ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.arc(weight.x, bottomHookY, 30, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            // Draw composite disks
            if (weight.compositeDisks && weight.compositeDisks.length > 0) {
                this.drawCompositeDisks(ctx, weight, renderedHeight, 0);
            }
            
            // Draw stacked weights
            if (weight.stackedWeights && weight.stackedWeights.length > 0) {
                this.drawStackedWeights(ctx, weight, renderedHeight);
            }
        });
    }

    drawCompositeDisks(ctx, weight, renderedHeight, rotation) {
        ctx.save();
        const rodSupportRingY = weight.y + renderedHeight * 0.325;
        let currentBottomY = rodSupportRingY;
        
        weight.compositeDisks.forEach((disk) => {
            const diskDef = this.experiment.getWeightById(disk.weightId);
            if (!diskDef) return;
            
            const diskImg = this.images.weights[disk.weightId] || this.images.weights[diskDef.id];
            const diskTargetSize = diskDef.targetSize ?? 50;
            const diskScale = diskTargetSize / (diskImg ? Math.max(diskImg.width, diskImg.height) : diskTargetSize);
            const diskHeight = diskImg ? diskImg.height * diskScale * 0.17 : diskTargetSize * 0.2;
            
            const diskY = currentBottomY - diskHeight / 2;
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 4;
            
            if (diskImg) {
                ctx.save();
                ctx.translate(weight.x, diskY);
                if (rotation) ctx.rotate(rotation);
                ctx.scale(diskScale, diskScale);
                ctx.drawImage(diskImg, -diskImg.width / 2, -diskImg.height / 2);
                ctx.restore();
            } else {
                ctx.fillStyle = '#888';
                ctx.fillRect(weight.x - diskTargetSize/2, diskY - diskHeight/2, diskTargetSize, diskHeight);
            }
            
            currentBottomY = diskY - diskHeight / 2;
        });
        
        ctx.restore();
    }

    drawStackedWeights(ctx, weight, renderedHeight) {
        ctx.save();
        const hookGap = 22;
        let currentTopY = weight.y + renderedHeight / 2 + hookGap;
        
        weight.stackedWeights.forEach((stackedWeight) => {
            const stackedDef = this.experiment.getWeightById(stackedWeight.weightId || stackedWeight.id);
            if (!stackedDef) return;
            
            const stackImg = this.images.weights[stackedWeight.weightId] || this.images.weights[stackedDef.id];
            const stackTargetSize = stackedDef.targetSize ?? 72;
            const stackScale = stackTargetSize / (stackImg ? Math.max(stackImg.width, stackImg.height) : stackTargetSize);
            const stackHeight = stackImg ? stackImg.height * stackScale : stackTargetSize * 0.9;
            
            // Draw hook
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(weight.x, currentTopY - hookGap);
            ctx.lineTo(weight.x, currentTopY);
            ctx.stroke();
            
            const stackCenterY = currentTopY + stackHeight / 2;
            
            if (stackImg) {
                ctx.save();
                ctx.translate(weight.x, stackCenterY);
                ctx.scale(stackScale, stackScale);
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
                ctx.drawImage(stackImg, -stackImg.width / 2, -stackImg.height / 2);
                ctx.restore();
            } else {
                ctx.fillStyle = '#888';
                ctx.fillRect(weight.x - stackTargetSize/2, stackCenterY - stackHeight/2, stackTargetSize, stackHeight);
            }
            
            currentTopY = stackCenterY + stackHeight / 2 + hookGap;
        });
        
        ctx.restore();
    }

    drawSpringPlaceholder(ctx) {
        const canvas = ctx.canvas;
        const width = 240;
        const height = 320;
        const centerX = canvas.width * 0.5;
        const centerY = canvas.height * 0.35;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 168, 107, 0.45)';
        ctx.fillStyle = 'rgba(0, 168, 107, 0.08)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        const left = centerX - width / 2;
        const top = centerY - height / 2;
        ctx.fillRect(left, top, width, height);
        ctx.strokeRect(left, top, width, height);

        ctx.setLineDash([]);
        ctx.restore();
        
        this.drawFreeWeights(ctx);
    }

    drawEquipmentLabel(ctx, x, y) {
        ctx.save();
        const attachedSpring = this.experiment.getAttachedSpring();
        const text = attachedSpring ? attachedSpring.name : 'Пружина';
        ctx.font = '14px "Fira Sans", Arial, sans-serif';
        const metrics = ctx.measureText(text);
        const padding = 12;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 28;
        
        ctx.fillStyle = 'rgba(15, 20, 41, 0.85)';
        ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
        
        ctx.strokeStyle = 'rgba(0, 168, 107, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
        
        ctx.fillStyle = '#E8EAF6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    drawRuler(ctx, x, y, physicalHeightPx) {
        const rulerWidth = 50;
        const cmToPx = this.experiment.getVisualPixelsPerCm();
        const canvas = ctx.canvas;

        const maxCmByCanvas = Math.max(5, Math.floor((canvas.height - y - 20) / cmToPx));
        const maxCm = Math.min(30, maxCmByCanvas);
        const rulerHeight = maxCm * cmToPx;
        
        ctx.save();
        
        // Background
        const rulerBg = ctx.createLinearGradient(x, y, x + rulerWidth, y);
        rulerBg.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        rulerBg.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = rulerBg;
        ctx.fillRect(x, y, rulerWidth, rulerHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, rulerWidth, rulerHeight);
        
        // Marks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '11px "Fira Sans", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 1.5;
        
        for (let cm = 0; cm <= maxCm; cm++) {
            const markY = y + cm * cmToPx;
            
            ctx.beginPath();
            ctx.moveTo(x, markY);
            ctx.lineTo(x + 20, markY);
            ctx.stroke();
            
            if (cm % 1 === 0) {
                ctx.fillText(cm.toString(), x + 24, markY);
            }
            
            if (cm < maxCm) {
                const halfMarkY = markY + cmToPx / 2;
                ctx.beginPath();
                ctx.moveTo(x, halfMarkY);
                ctx.lineTo(x + 12, halfMarkY);
                ctx.stroke();
            }
        }
        
        // Unit
        ctx.save();
        ctx.font = 'bold 12px "Fira Sans", Arial, sans-serif';
        ctx.fillStyle = 'rgba(0, 168, 107, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('см', x + rulerWidth / 2, y - 12);
        ctx.restore();
        
        // Indicator
        const visualHeight = physicalHeightPx * this.visual.scale;

        if (visualHeight <= rulerHeight) {
            const indicatorY = y + visualHeight;
            
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.9)';
            ctx.beginPath();
            ctx.moveTo(x, indicatorY);
            ctx.lineTo(x - 8, indicatorY - 6);
            ctx.lineTo(x - 8, indicatorY + 6);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 179, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x - 8, indicatorY);
            ctx.lineTo(x - 60, indicatorY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 179, 0, 0.8)';
            ctx.fillRect(x - 6, y + rulerHeight - 8, 12, 8);
            ctx.restore();
        }
        
        ctx.restore();
    }

    drawDynamometerSetup(ctx) {
        const state = this.getState();
        const centerX = state.dynamometerPosition.x;
        const centerY = state.dynamometerPosition.y;
        
        const dynamometer = this.experiment.getEquipmentById(state.attachedDynamometerId);
        if (!dynamometer) return;
        
        const maxForce = dynamometer.maxForce;
        const scale = dynamometer.scale;
        
        const width = 80;
        const height = 300;
        const scaleHeight = 200;
        
        ctx.save();
        
        // Body
        const gradient = ctx.createLinearGradient(centerX - width/2, centerY, centerX + width/2, centerY);
        gradient.addColorStop(0, 'rgba(220, 220, 220, 0.98)');
        gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.98)');
        gradient.addColorStop(1, 'rgba(220, 220, 220, 0.98)');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - width/2, centerY, width, height);
        
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - width/2, centerY, width, height);
        
        // Top Hook
        const topHookY = centerY - 15;
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, topHookY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, topHookY - 8, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dynamometer.name, centerX, centerY + 25);
        
        // Scale
        const scaleTop = centerY + 50;
        const scaleX = centerX;
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleTop);
        ctx.lineTo(scaleX, scaleTop + scaleHeight);
        ctx.stroke();
        
        const numDivisions = maxForce / scale;
        for (let i = 0; i <= numDivisions; i++) {
            const markForce = i * scale;
            const markY = scaleTop + scaleHeight - (markForce / maxForce) * scaleHeight;
            
            ctx.beginPath();
            ctx.moveTo(scaleX - 12, markY);
            ctx.lineTo(scaleX + 12, markY);
            ctx.stroke();
            
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(markForce.toFixed(1), scaleX - 16, markY + 3);
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Н', scaleX + 30, scaleTop - 5);
        
        // Indicator
        const totalMass = this.experiment.getTotalAttachedMass();
        const force = (totalMass / 1000) * this.experiment.physics.gravity;
        
        const indicatorY = scaleTop + scaleHeight - (Math.min(force, maxForce) / maxForce) * scaleHeight;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.moveTo(scaleX + 15, indicatorY);
        ctx.lineTo(scaleX + 25, indicatorY - 5);
        ctx.lineTo(scaleX + 25, indicatorY + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scaleX + 12, indicatorY);
        ctx.lineTo(scaleX + 25, indicatorY);
        ctx.stroke();
        
        // Digital Display
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textAlign = 'center';
        const displayText = force > maxForce ? `>${maxForce.toFixed(1)}` : force.toFixed(2);
        ctx.fillText(`${displayText} Н`, centerX, centerY + height - 20);
        
        // Bottom Hook
        const bottomHookY = centerY + height;
        
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, bottomHookY);
        ctx.lineTo(centerX, bottomHookY + 15);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, bottomHookY + 23, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Attached Weights
        const hookX = centerX;
        const gruzHookY = bottomHookY + 31;
        this.drawAttachedWeights(ctx, hookX, gruzHookY);
        
        // Free Weights
        this.drawFreeWeights(ctx);
        
        // Snap Zone for Dynamometer
        const draggedWeight = state.freeWeights?.find(w => w.isDragging);
        if (draggedWeight) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            
            const dynBottomHookX = centerX;
            const dynBottomHookY = bottomHookY + 23;
            ctx.beginPath();
            ctx.arc(dynBottomHookX, dynBottomHookY, 100, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawSpringCoils(ctx, anchor, length, coils, springRadius, wireRadius, isOverloaded = false) {
        const coilHeight = length / coils;
        
        // Shadow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(8px)';
        for (let i = 0; i < coils; i++) {
            const y = anchor.y + i * coilHeight + coilHeight / 2;
            ctx.beginPath();
            ctx.ellipse(anchor.x + 2, y + 3, springRadius + 1, wireRadius + 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.filter = 'none';
        ctx.restore();

        // Coils
        for (let i = 0; i < coils; i++) {
            const y = anchor.y + i * coilHeight + coilHeight / 2;
            
            ctx.save();
            const coilGrad = ctx.createLinearGradient(
                anchor.x - springRadius, y,
                anchor.x + springRadius, y
            );
            
            if (isOverloaded) {
                coilGrad.addColorStop(0, '#d0b8b8');
                coilGrad.addColorStop(0.2, '#f2e8e8');
                coilGrad.addColorStop(0.5, '#fbf8f8');
                coilGrad.addColorStop(0.8, '#e6d4d4');
                coilGrad.addColorStop(1, '#b29a9a');
                ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
            } else {
                coilGrad.addColorStop(0, '#b8c2d0');
                coilGrad.addColorStop(0.2, '#e8ecf2');
                coilGrad.addColorStop(0.5, '#f8f9fb');
                coilGrad.addColorStop(0.8, '#d4dce6');
                coilGrad.addColorStop(1, '#9aa4b2');
            }
            
            ctx.fillStyle = coilGrad;
            ctx.beginPath();
            ctx.ellipse(anchor.x, y, springRadius, wireRadius, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.5)' : 'rgba(80, 90, 105, 0.3)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore();
            
            // Highlight
            ctx.save();
            const hlGrad = ctx.createRadialGradient(
                anchor.x - springRadius * 0.3, y - wireRadius * 0.3, 0,
                anchor.x, y, springRadius * 0.6
            );
            hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            hlGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
            hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = hlGrad;
            ctx.beginPath();
            ctx.ellipse(anchor.x - springRadius * 0.2, y - wireRadius * 0.2, springRadius * 0.5, wireRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawTopHook(ctx, x, y, wireRadius, isOverloaded = false) {
        const hookRadius = wireRadius * 2;
        
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 2, hookRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        ctx.save();
        const hookGrad = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, hookRadius * 1.2);
        if (isOverloaded) {
             hookGrad.addColorStop(0, '#fbf8f8');
             hookGrad.addColorStop(0.4, '#f2e8e8');
             hookGrad.addColorStop(1, '#b29a9a');
        } else {
             hookGrad.addColorStop(0, '#ffffff');
             hookGrad.addColorStop(0.4, '#e8ecf2');
             hookGrad.addColorStop(1, '#9aa4b2');
        }
        ctx.fillStyle = hookGrad;
        ctx.beginPath();
        ctx.arc(x, y, hookRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.4)' : 'rgba(80, 90, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, hookRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBottomHook(ctx, x, y, wireRadius, isOverloaded = false) {
        const stemLength = 20;
        const hookWidth = 18;
        const hookHeight = 24;
        
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#0a0e18';
        ctx.filter = 'blur(6px)';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 2);
        ctx.lineTo(x + 1, y + stemLength + 2);
        ctx.arc(x + 1, y + stemLength + hookHeight / 2 + 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x + 1, y + stemLength + 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        ctx.save();
        const stemGrad = ctx.createLinearGradient(x - wireRadius, y, x + wireRadius, y);
        if (isOverloaded) {
            stemGrad.addColorStop(0, '#b29a9a');
            stemGrad.addColorStop(0.5, '#f2e8e8');
            stemGrad.addColorStop(1, '#d0b8b8');
        } else {
            stemGrad.addColorStop(0, '#9aa4b2');
            stemGrad.addColorStop(0.5, '#e8ecf2');
            stemGrad.addColorStop(1, '#b8c2d0');
        }
        ctx.fillStyle = stemGrad;
        ctx.fillRect(x - wireRadius, y, wireRadius * 2, stemLength);
        ctx.strokeStyle = isOverloaded ? 'rgba(150, 50, 50, 0.3)' : 'rgba(80, 90, 105, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - wireRadius, y, wireRadius * 2, stemLength);
        ctx.restore();
        
        ctx.save();
        ctx.lineWidth = wireRadius * 2;
        ctx.lineCap = 'round';
        const hookGrad = ctx.createLinearGradient(
            x - hookWidth / 2, y + stemLength,
            x + hookWidth / 2, y + stemLength + hookHeight
        );
        hookGrad.addColorStop(0, '#b8c2d0');
        hookGrad.addColorStop(0.3, '#e8ecf2');
        hookGrad.addColorStop(0.7, '#d4dce6');
        hookGrad.addColorStop(1, '#9aa4b2');
        ctx.strokeStyle = hookGrad;
        
        ctx.beginPath();
        ctx.arc(x, y + stemLength + hookHeight / 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(80, 90, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y + stemLength + hookHeight / 2, hookWidth / 2, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x - 1, y + stemLength + hookHeight / 2 - 1, hookWidth / 2 - 2, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
        ctx.restore();
    }

    drawAttachedWeights(ctx, hookX, hookY) {
        const state = this.getState();
        if (!state.weightAttached || !state.attachedWeights?.length) {
            return;
        }

        let currentY = hookY;
        const now = performance.now() / 1000;

        state.attachedWeights.forEach((item, index) => {
            const def = this.experiment.getWeightById(item.id);
            if (!def) return;

            const img = this.images.weights[item.id] || this.images.weights[def.id];
            const targetSize = def.targetSize ?? 72;
            const hookGap = def.hookGap ?? 22;
            const renderScale = targetSize / (img ? Math.max(img.width, img.height) : targetSize);
            const renderedHeight = img ? img.height * renderScale : targetSize * 0.9;
            
            const rotationAmplitude = state.isAnimating ? 0.12 : 0.02;
            const rotation = Math.sin(now * 1.5 + index * 0.4) * rotationAmplitude;

            // Hook
            ctx.save();
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hookX, currentY);
            ctx.lineTo(hookX, currentY + hookGap);
            ctx.stroke();
            ctx.restore();

            const centerY = currentY + hookGap + renderedHeight / 2;

            if (img) {
                ctx.save();
                ctx.translate(hookX, centerY);
                ctx.rotate(rotation);
                
                const scale = targetSize / Math.max(img.width, img.height);
                ctx.scale(scale, scale);
                
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 5;
                
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                ctx.restore();
            } else {
                this.drawWeightPlaceholder(ctx, hookX, centerY, targetSize, renderedHeight, rotation);
            }

            // Composite Disks
            if (item.compositeDisks && item.compositeDisks.length > 0) {
                ctx.save();
                ctx.translate(hookX, centerY);
                ctx.rotate(rotation);
                ctx.translate(-hookX, -centerY); // Rotate around center
                this.drawCompositeDisks(ctx, item, renderedHeight, 0);
                ctx.restore();
            }

            currentY = centerY + renderedHeight / 2;
        });
    }

    drawWeightPlaceholder(ctx, x, y, width, height, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        const w = width * 0.6;
        const h = height * 0.7;

        const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        gradient.addColorStop(0, '#8d99ae');
        gradient.addColorStop(0.5, '#edf2f4');
        gradient.addColorStop(1, '#8d99ae');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#2b2d42';
        ctx.lineWidth = 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.restore();
    }

    /**
     * 🎨 Отрисовка миниатюры пружины для инвентаря
     */
    drawSpringPreview(ctx, spring) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        const centerX = width / 2;
        const topY = 15;
        const springHeight = 70;
        const coils = 8;
        const springRadius = 8;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        // Верхнее крепление
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#888';
        ctx.fillRect(centerX - 15, topY - 5, 30, 5);
        ctx.strokeRect(centerX - 15, topY - 5, 30, 5);
        
        // Витки пружины (металлический цвет)
        const gradient = ctx.createLinearGradient(centerX - springRadius, 0, centerX + springRadius, 0);
        gradient.addColorStop(0, '#A0A0A0');
        gradient.addColorStop(0.3, '#D0D0D0');
        gradient.addColorStop(0.5, '#E8E8E8');
        gradient.addColorStop(0.7, '#D0D0D0');
        gradient.addColorStop(1, '#A0A0A0');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const coilHeight = springHeight / coils;
        
        for (let i = 0; i < coils; i++) {
            const y1 = topY + i * coilHeight;
            const y2 = topY + (i + 0.5) * coilHeight;
            const y3 = topY + (i + 1) * coilHeight;
            
            ctx.beginPath();
            ctx.moveTo(centerX, y1);
            ctx.quadraticCurveTo(centerX + springRadius, y1 + coilHeight * 0.25, centerX + springRadius, y2);
            ctx.quadraticCurveTo(centerX + springRadius, y2 + coilHeight * 0.25, centerX, y3);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX, y1);
            ctx.quadraticCurveTo(centerX - springRadius, y1 + coilHeight * 0.25, centerX - springRadius, y2);
            ctx.quadraticCurveTo(centerX - springRadius, y2 + coilHeight * 0.25, centerX, y3);
            ctx.stroke();
        }
        
        // Нижний крючок
        const bottomY = topY + springHeight;
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX, bottomY);
        ctx.lineTo(centerX, bottomY + 10);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, bottomY + 15, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * 🎨 Отрисовка миниатюры динамометра для инвентаря
     */
    drawDynamometerPreview(ctx, dynamometer) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Размеры динамометра
        const bodyWidth = 30;
        const bodyHeight = 80;
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        // Корпус
        const gradient = ctx.createLinearGradient(centerX - bodyWidth/2, centerY - bodyHeight/2, 
                                                   centerX + bodyWidth/2, centerY - bodyHeight/2);
        gradient.addColorStop(0, '#dcdcdc');
        gradient.addColorStop(0.5, '#f0f0f0');
        gradient.addColorStop(1, '#dcdcdc');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Рамка корпуса
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight);
        
        // Верхний крючок
        ctx.strokeStyle = '#969696';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - bodyHeight/2);
        ctx.lineTo(centerX, centerY - bodyHeight/2 - 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY - bodyHeight/2 - 12, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Шкала (упрощенная)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - bodyHeight/2 + 10);
        ctx.lineTo(centerX, centerY + bodyHeight/2 - 15);
        ctx.stroke();
        
        // Несколько делений
        for (let i = 0; i <= 4; i++) {
            const y = centerY - bodyHeight/2 + 10 + i * 13;
            ctx.beginPath();
            ctx.moveTo(centerX - 4, y);
            ctx.lineTo(centerX + 4, y);
            ctx.stroke();
        }
        
        // Название
        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dynamometer.maxForce + 'Н', centerX, centerY + bodyHeight/2 - 5);
        
        // Нижний крючок
        ctx.strokeStyle = '#969696';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + bodyHeight/2);
        ctx.lineTo(centerX, centerY + bodyHeight/2 + 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY + bodyHeight/2 + 12, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Get status text for a weight state
     * @param {Object} weightState 
     */
    getWeightStatusText(weightState) {
        if (!weightState.found) return 'Неизвестно';
        
        const state = this.getState();
        
        switch (weightState.state) {
            case 'pending':
                return 'Подвешивается…';
                
            case 'attached-last':
            case 'attached-middle':
                const equipmentName = state.dynamometerAttached ? 'динамометре' : 'пружине';
                const chainInfo = weightState.positionInChain ? ` (${weightState.positionInChain}-й в цепочке)` : '';
                return `На ${equipmentName}${chainInfo}`;
                
            case 'attached-composite-disk':
                const parentEquipmentName = state.dynamometerAttached ? 'динамометре' : 'пружине';
                return `На штанге (${parentEquipmentName})`;
                
            case 'free-on-canvas':
                if (weightState.freeWeight?.compositeDisks?.length > 0) {
                    const disksCount = weightState.freeWeight.compositeDisks.length;
                    const totalMass = weightState.freeWeight.mass;
                    const diskWord = disksCount === 1 ? 'диск' : (disksCount > 4 ? 'дисков' : 'диска');
                    return `На столе (${disksCount} ${diskWord}, ${totalMass}г)`;
                } else if (weightState.freeWeight?.stackedWeights?.length > 0) {
                    const stackCount = weightState.freeWeight.stackedWeights.length;
                    const gruzWord = stackCount === 1 ? 'грузом' : 'грузами';
                    return `На столе (сцеплен с ${stackCount} ${gruzWord})`;
                } else {
                    return 'На столе';
                }
                
            case 'free-composite-disk':
                return `На штанге (стол)`;
                
            case 'free-in-stack':
                return 'На столе (в стопке)';
                
            case 'available':
            default:
                return 'В комплекте';
        }
    }

    renderWeightsInventory() {
        const container = this.experiment.ui?.weightsContainer || document.getElementById('weights-container');
        if (!container) {
            console.warn('⚠️ Weights container not found');
            return;
        }

        const state = this.getState();

        // Log only if weights attached
        if (state.attachedWeights?.length > 0) {
            console.log('[RENDER-WEIGHTS] Attached:', state.attachedWeights.length);
        }

        const existingItems = container.querySelectorAll('.weight-item');
        
        // If no items, create from scratch
        if (existingItems.length === 0) {
            this.createWeightsInventoryFromScratch();
            return;
        }

        // Update existing items
        existingItems.forEach((item) => {
            const weightId = item.dataset.weightId;
            const weightState = this.experiment.model.getWeightState(weightId);
            
            if (!weightState.found) return;

            const weight = weightState.weight;

            // Update dataset and classes
            item.dataset.status = weightState.state;

            if (weightState.isDirectlyAttached || weightState.isPending || weightState.isFreeOnCanvas || 
                weightState.isPartOfFreeComposite || weightState.isPartOfFreeStack) {
                item.classList.add('used');
                item.classList.add('weight-item--attached');
            } else {
                item.classList.remove('used');
                item.classList.remove('weight-item--attached');
            }

            // Action Buttons
            let actionBtn = item.querySelector('.weight-action');
            let hintDiv = item.querySelector('.weight-hint');
            
            if (hintDiv) {
                hintDiv.remove();
                hintDiv = null;
            }
            
            if (weightState.canRemove && weightState.buttonText) {
                if (!actionBtn) {
                    actionBtn = document.createElement('button');
                    actionBtn.type = 'button';
                    actionBtn.className = 'weight-action';
                    item.appendChild(actionBtn);
                } else {
                    const newBtn = actionBtn.cloneNode(true);
                    actionBtn.parentNode.replaceChild(newBtn, actionBtn);
                    actionBtn = newBtn;
                }
                
                actionBtn.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    switch (weightState.removeAction) {
                        case 'detach':
                            this.experiment.detachWeight(weight.id);
                            break;
                        case 'remove-free':
                        case 'remove-disk':
                        case 'remove-from-stack':
                            this.experiment.model.removeFreeWeight(weight.id);
                            break;
                    }
                });
                
                actionBtn.textContent = weightState.buttonText;
                actionBtn.style.display = 'block';
                actionBtn.disabled = false;
                
            } else if (weightState.state === 'available') {
                if (actionBtn) actionBtn.style.display = 'none';
                
                hintDiv = document.createElement('div');
                hintDiv.className = 'weight-hint';
                hintDiv.textContent = 'Перетащите на установку';
                item.appendChild(hintDiv);
                
            } else {
                if (actionBtn) actionBtn.style.display = 'none';
            }

            // Status text
            const status = item.querySelector('.weight-status');
            if (status) {
                status.textContent = this.getWeightStatusText(weightState);
            }
        });
    }

    createWeightsInventoryFromScratch() {
        const container = this.experiment.ui?.weightsContainer || document.getElementById('weights-container');
        if (!container) return;

        container.innerHTML = '';
        const inventory = this.experiment.weightsInventory || [];

        inventory.forEach((weight) => {
            const weightState = this.experiment.model.getWeightState(weight.id);
            if (!weightState.found) return;

            const item = document.createElement('div');
            item.className = 'weight-item';
            item.dataset.type = 'weight';
            item.dataset.mass = weight.mass;
            item.dataset.weightId = weight.id;
            item.dataset.hooksTop = weight.hooksTop ? 'true' : 'false';
            item.dataset.hooksBottom = weight.hooksBottom ? 'true' : 'false';
            item.dataset.status = weightState.state;

            if (weightState.isDirectlyAttached || weightState.isPending || weightState.isFreeOnCanvas ||
                weightState.isPartOfFreeComposite || weightState.isPartOfFreeStack) {
                item.classList.add('used');
                item.classList.add('weight-item--attached');
            }

            const figure = document.createElement('div');
            figure.className = 'weight-figure';

            if (weight.icon) {
                const img = document.createElement('img');
                img.src = weight.icon;
                img.alt = weight.name;
                figure.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'weight-placeholder';
                placeholder.textContent = `${weight.mass} г`;
                figure.appendChild(placeholder);
            }

            const label = document.createElement('div');
            label.className = 'weight-label';
            label.textContent = `${weight.mass} г`;

            const status = document.createElement('div');
            status.className = 'weight-status';
            status.textContent = this.getWeightStatusText(weightState);

            item.append(figure, label, status);

            if (weightState.canRemove && weightState.buttonText) {
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'weight-action';
                action.textContent = weightState.buttonText;
                action.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    switch (weightState.removeAction) {
                        case 'detach':
                            this.experiment.detachWeight(weight.id);
                            break;
                        case 'remove-free':
                        case 'remove-disk':
                        case 'remove-from-stack':
                            this.experiment.model.removeFreeWeight(weight.id);
                            break;
                    }
                });
                item.appendChild(action);
                
            } else if (weightState.state === 'attached-middle') {
                const massInfo = document.createElement('div');
                massInfo.className = 'weight-mass-info';
                massInfo.textContent = `${weight.mass} г`;
                item.appendChild(massInfo);
                
            } else if (weightState.state === 'available') {
                const hint = document.createElement('div');
                hint.className = 'weight-hint';
                hint.textContent = 'Перетащите на установку';
                item.appendChild(hint);
            }

            container.appendChild(item);
        });

        this.experiment.reinitDragSources?.();
    }
}
