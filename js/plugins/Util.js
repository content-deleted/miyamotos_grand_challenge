var Imported = Imported || {};
Imported["Util"] = true;

var Util = Util || {};

(function (_) { 
    "use strict";
    Util.EventCanSeePlayer = function(interpreter) {
        const event = $gameMap._events[interpreter._eventId];
        const d = event._direction;
        let x = event._x; let y = event._y;

        do {
        if($gamePlayer.x == x && $gamePlayer.y == y) {
            return true;
        }
        x += (d === 6 ? 1 : d === 4 ? -1 : 0);
        y += (d === 2 ? 1 : d === 8 ? -1 : 0);
        } while($gameMap.isPassable(x, y, d) && !$gamePlayer.isCollidedWithCharacters(x, y))
        return false;
    }

    Util.StartPlatformerAnim = function(target, animationId, flipped = false, bottom = false) {
        if(!target) return;
        target.startAnimation($dataAnimations[animationId], flipped);
        // logic to keep it in place
        let anim = target._animationSprites[target._animationSprites.length - 1];
        anim.parent.removeChild(anim);
        if(bottom) {
            target.parent.addChildAt(anim, 0);
        } else {
            target.parent.addChild(anim);
        }
        anim._startingDisplayX = $gameMap._displayX;
        anim._startingDisplayY = $gameMap._displayY;
        anim._targetX = target.x;
        anim._targetY = target.y;
        anim._startingX = ($gamePlayer._direction == 6 ? -12 : 12);
        anim._startingY = -24;
        anim.updatePosition = function() {
            this.x = (anim._startingDisplayX - $gameMap._displayX) * 48 + anim._startingX + anim._targetX;
            this.y = (anim._startingDisplayY - $gameMap._displayY) * 48 + anim._startingY + anim._targetY;
        }
        return anim;
    }

    Util.CheckEventTriggers = function() {
        const pX = $gamePlayer._x - 0.5;
        const pY = $gamePlayer._y - 0.5;
        $gameMap.events().filter(e => e._trigger == 1 && !e._locked &&
            e._x < pX + 0.5 && e._x > pX - 0.5 &&
            e._y < pY + 0.5 && e._y > pY - 0.5).forEach(x => {
                x.start();
            });
    }

    Game_Interpreter.prototype.FlyPlayer = function(g = -0.35) {
        const event = SceneManager._scene._playerEvent;
        event.gravity = g; 
    }

    Game_Interpreter.prototype.WaterPlayer = function() {
        const event = SceneManager._scene._playerEvent;
        event.gravity *= 0.66; 
        event.hasUsedDoubleJump = false;
        event.hasUsedJump = false;
        event.framesSinceGrounded = 0;
    }

    Game_Interpreter.prototype.SetRespawnPoint = function() {
        SceneManager._scene._startingPlayerX = $gamePlayer._x; SceneManager._scene._startingPlayerY = $gamePlayer._y;
        SceneManager._scene._startingDisplayX = $gameMap._displayX;
        SceneManager._scene._startingDisplayY = $gameMap._displayY;
    }

    Game_Interpreter.prototype.KillPlayer = function() {
        if($gamePlayer._invincible) return;
        stopGrapple(SceneManager._scene._playerEvent);
        SceneManager._scene._playerEvent.gravity = 0;
        $gameScreen.startFlash([255, 0, 0, 128], 8);
        $gamePlayer._realX = $gamePlayer._x = SceneManager._scene._startingPlayerX;
        $gamePlayer._realY = $gamePlayer._y = SceneManager._scene._startingPlayerY;

        $gameMap._displayX = SceneManager._scene._startingDisplayX;
        $gameMap._displayY = SceneManager._scene._startingDisplayY;
    }

    Game_Interpreter.prototype.StartSideScrollerScene = function() {
        const event = $gameMap._events[this._eventId];
        SceneManager._scene._playerEvent = event;
        event.gravity = 0.2;
        event.grounded = true;
        event.animeTimer = 0;
        event.framesSinceGrounded = 0;
        event.framesSinceDownPressed = 30;
        $gamePlayer._realX = $gamePlayer._x = $gamePlayer._x;

        SceneManager._scene._startingPlayerX = $gamePlayer._x; SceneManager._scene._startingPlayerY = $gamePlayer._y;
        $gameMap._displayY = $gamePlayer.y - 7;
        if($gameMap._displayY < 0) $gameMap._displayY = 0;
        if($gameMap._displayY > $gameMap.height() - 13) $gameMap._displayY = $gameMap.height() - 13;
        SceneManager._scene._startingDisplayX = $gameMap._displayX; SceneManager._scene._startingDisplayY = $gameMap._displayY;
        event.pSprite = SceneManager._scene._spriteset._characterSprites.find( x => x._character == $gamePlayer);
        event.pSprite.anchor.x = event.pSprite.anchor.y = 1

        const p1 = SceneManager._scene.parallax1;
        const p2 = SceneManager._scene.parallax1;
        const parallaxPicture1 = p1 ? ImageManager.loadPicture(p1) : null;
        const parallaxPicture2 = p2 ? ImageManager.loadPicture(p2) : null;
        
        event.parallax1 = new TilingSprite(parallaxPicture1);
        event.parallax1.move(0, 0, Graphics.width, 414);
        SceneManager._scene._spriteset._parallax.addChild(event.parallax1);

        event.parallax2 = new TilingSprite(parallaxPicture2);
        event.parallax2.move(0, 0, Graphics.width, 261);
        SceneManager._scene._spriteset._parallax.addChild(event.parallax2);
    }

    Game_Interpreter.prototype.PrepareSideScrollTransfer = function() {
        this.setWaitMode('transfer');
        $gameSelfSwitches.setValue([$gameMap._mapId, this._eventId, 'A'], false);
        $gameSelfSwitches.setValue([$gameMap._mapId, this._eventId, 'B'], false);
        $gameSelfSwitches.setValue([$gameMap._mapId, this._eventId, 'C'], false);
        $gameSelfSwitches.setValue([$gameMap._mapId, this._eventId, 'D'], false);
        $gamePlayer._invincible = false;

        const event = SceneManager._scene._playerEvent;
        if(!event) return; // should never happen 
        stopDash(event);
        stopGrapple(event);
        event.hasUsedDoubleJump = false;
        if(event.blockPlacement) {
            $gameMap.writeTile(event.blockPlacement.x, event.blockPlacement.y, 3, event.blockPlacement.prev);
        }
    }

    const doubleJumpEnabled = function() {
        return $gameSwitches.value(1);
    }
    const dashEnabled = function() {
        return true || $gameSwitches.value(2);
    }
    const grappleEnabled = function() {
        return $gameSwitches.value(3);
    }
    const blockEnabled = function() {
        return true || $gameSwitches.value(4);
    }
    const stopDash = function(playerEvent) {
        playerEvent.pSprite.rotation = 0;
        playerEvent.dashing = false;
        $gamePlayer._invincible = false;
        playerEvent.pSprite.anchor.x = playerEvent.pSprite.anchor.y = 1;
    }
    const stopGrapple = function(playerEvent) {
        if(!playerEvent.grappling) return;
        playerEvent.grappleArms.forEach(x => x.parent.removeChild(x));
        playerEvent.grappling = false;
        playerEvent.grapplePoint = null;
        if(playerEvent.grappleHand) playerEvent.grappleHand.parent.removeChild(playerEvent.grappleHand);
        playerEvent.grappleHand = null;
    }
    const canMove = function(playerEvent) {
        return !(playerEvent.dashing || playerEvent.grappling);
    }
    Game_Interpreter.prototype.RunSideScrollerTick = function() {
        // dont run if a message is playing
        if(SceneManager._scene._pauseForMessage && SceneManager._scene._messageWindow && (SceneManager._scene._messageWindow.isOpen() || SceneManager._scene._messageWindow.isAnySubWindowActive())) return;

        const event = $gameMap._events[this._eventId];
        const yoff = -0.5;

        if(Input.isTriggered("#r")) {
            this.KillPlayer();
            return;
        }

        // check for dashing
        if(dashEnabled() && canMove(event)) {
            if(!event.grounded && Input.isTriggered("down")) {
                //if(event.framesSinceDownPressed < 15) {
                    event.dashing = true;
                    event.gravity = 0.1;
                    $gamePlayer._invincible = true;
                    event.pSprite.anchor.x = event.pSprite.anchor.y = 0.5;
               // }
                event.framesSinceDownPressed = 0;
            }
            event.framesSinceDownPressed++;
        }

        // check for grapple
        if(grappleEnabled()) {
            // g
            if(canMove(event) && Input.isTriggered("#g")) {
                event.grappling = true;

                const flipped = $gamePlayer._direction == 6 ? true : false;
                const anim = Util.StartPlatformerAnim(event.pSprite, 132, flipped, true);
                event.grappleHand = anim;
                anim._startingX += 20 * (event.grappleDir == 6 ? 1 : -1)
                event.grappleArms = [];
                event.grappleTimer = -8;
                event.grapplePoint = null;
                event.grappleDir = $gamePlayer._direction;
            }

            if(event.grappling) {
                event.grappleTimer++;
                const gSpeed = 8;
                if(event.grapplePoint) {
                    if(event.grappleDir == 6 ? $gamePlayer._x >= event.grapplePoint.x - 0.5 : $gamePlayer._x <= event.grapplePoint.x + 1.5) {
                        stopGrapple(event);
                        return;
                    }
                    if(event.grappleTimer > 1 && event.grappleArms.length) {
                        const anim = event.grappleArms.shift();
                        anim.parent.removeChild(anim);
                        event.grappleTimer = 0;
                    }

                    $gamePlayer._realX += (gSpeed / 48) * (event.grappleDir == 6 ? 1 : -1);
                    $gamePlayer._x = $gamePlayer._realX;
                } else {
                    event.grappleHand._startingX += gSpeed * (event.grappleDir == 6 ? 1 : -1);

                    if(event.grappleTimer > 1) {
                        const anim = Util.StartPlatformerAnim(event.pSprite, 133, event.grappleDir == 6, true);
                        anim._startingX = event.grappleHand._startingX - 40 * (event.grappleDir == 6 ? 1 : -1);
                        event.grappleArms.push(anim);
                        event.grappleTimer = 0;
                    }

                    const realX = (event.grappleHand._startingX / 48) + $gamePlayer._x;
                    const targX = event.grappleDir == 6 ? Math.ceil(realX-0.5) : Math.floor(realX-0.5);
                    const targY = event.grounded ? Math.floor($gamePlayer._y) : Math.floor($gamePlayer._y + 0.2);
                    if(!$gameMap.isPassable(targX, targY, event.grappleDir) || targX >= $gameMap.width() - 1.1 || targX <= 0.1) {
                        event.grapplePoint = {x: targX, y: targY};

                        // extra segment for the road
                        const seg = Util.StartPlatformerAnim(event.pSprite, 133, event.grappleDir == 6, true);
                        seg._startingX = event.grappleHand._startingX - 40 * (event.grappleDir == 6 ? 1 : -1);
                        event.grappleArms.push(seg);
                        event.grappleTimer = 0;

                        const anim = Util.StartPlatformerAnim(event.pSprite, 134, event.grappleDir == 6, true);
                        anim._startingX = event.grappleHand._startingX;
                        // destroy animation
                        if(event.grappleHand) event.grappleHand.parent.removeChild(event.grappleHand);

                        event.grappleHand = anim;

                        event.grappleTimer = 0;
                    }
                }
            }
        }

        if(blockEnabled()) {
            if(canMove(event) && Input.isTriggered("#b")) {
                const anim = Util.StartPlatformerAnim(event.pSprite, 136, false, true);
                event.grappleHand = anim;
                anim._startingX = 24;
                anim._startingY = -60;
                // erase previous
                if(event.blockPlacement) {
                    $gameMap.writeTile(event.blockPlacement.x, event.blockPlacement.y, 3, event.blockPlacement.prev);
                }

                const targX = Math.floor($gamePlayer._x);
                const targY = Math.floor($gamePlayer._y) - 1;
                const prev = $gameMap.tileId(targX,targY,3);
                event.blockPlacement = {x: targX, y: targY, prev: prev};

                $gameMap.writeTile(targX, targY, 3, 56);
                $gameMap.refreshTilemap();
            }
        }


        if(canMove(event)) {
            // check for double jump
            if(doubleJumpEnabled() && (event.hasUsedJump || event.framesSinceGrounded >= 5) && !event.hasUsedDoubleJump && (Input.isTriggered("ok") || Input.isTriggered("up"))) {
                event.hasUsedDoubleJump = true;
                event.gravity = -0.20;
                event.grounded = false;
                AudioManager.playSe({ name: "Miss", volume: 80, pitch: 100, pan: 0 });
                Util.StartPlatformerAnim(event.pSprite, 198);
            }

            // check for jump
            if(!event.hasUsedJump && event.framesSinceGrounded < 5 && (Input.isTriggered("ok") || Input.isTriggered("up"))) {
                event.hasUsedJump = true;
                event.grounded = false;
                event.pSprite.rotation = 0; event.pSprite.anchor.x = event.pSprite.anchor.y = 1;
                event.gravity = -0.25; 
                AudioManager.playSe({ name: "Miss", volume: 80, pitch: 100, pan: 0 });
            }
        }

        // update y for falling or jumping
        if(!event.grappling) {
            if(event.gravity < 0 || !event.grounded) { 
                $gamePlayer._y += event.gravity;
                $gamePlayer._realY = $gamePlayer._y;
            }
            if(event.gravity < 0.3) {
                event.gravity+= 0.02;
            }
        }

        let isMoved = false;
        if(event.dashing) {
            event.pSprite.rotation += 0.5;
            if(Input.isTriggered("ok") || Input.isTriggered("up")) {
                stopDash(event);
                event.gravity = -0.1;
                event.hasUsedJump = true;
            }
        }
        if(canMove(event)) {
            // move left and right
            if(Input.isPressed("left") && ($gameMap.isPassable(Math.floor($gamePlayer._x-0.5), Math.floor($gamePlayer._y), 4) || $gamePlayer._realX < 0.5)) { 
                $gamePlayer._realX -= 0.1;
                $gamePlayer._x = $gamePlayer._realX;
                $gamePlayer._direction = 4;
                isMoved = true;
                if(SceneManager._scene.leftMap && $gamePlayer._realX <= 0.1) {
                    // $gameSelfSwitches.setValue([$gameMap._mapId, event._eventId, 'C'], true);
                    const eventY = event.grounded ? $gamePlayer._realY : $gamePlayer._realY;
                    $gamePlayer.reserveTransfer(SceneManager._scene.leftMap, "end", eventY, $gamePlayer._direction, 0);
                    this.PrepareSideScrollTransfer();
                }
            } else if(Input.isPressed("right") && ($gameMap.isPassable(Math.ceil($gamePlayer._x-0.5), Math.floor($gamePlayer._y), 6) || $gamePlayer._realX > $gameMap.width() - 1.5)) {
                $gamePlayer._realX += 0.1;
                $gamePlayer._x = $gamePlayer._realX;
                $gamePlayer._direction = 6;
                isMoved = true;
                if(SceneManager._scene.rightMap && $gamePlayer._realX >= $gameMap.width() - 1.1) {
                    // $gameSelfSwitches.setValue([$gameMap._mapId, event._eventId, 'D'], true);
                    const eventY = event.grounded ? $gamePlayer._realY  : $gamePlayer._realY;
                    $gamePlayer.reserveTransfer(SceneManager._scene.rightMap, 0, eventY, $gamePlayer._direction, 0);
                    this.PrepareSideScrollTransfer();
                }
            }
        }
        // handle jump and land
        let prevGround = event.grounded;
        if(event.gravity >= 0) {
            event.grounded = !$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 - 0.1), Math.floor($gamePlayer._y + yoff), 2) ||
                !$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 + 0.1), Math.floor($gamePlayer._y + yoff), 2);
            if(event.grounded) {
                if(!prevGround) {
                    // add landing dust here
                    if($gamePlayer._direction == 6) {
                        Util.StartPlatformerAnim(event.pSprite, 200);
                    } else {
                        Util.StartPlatformerAnim(event.pSprite, 197, true);
                    }

                    if(event.dashing) {
                        stopDash(event);
                    }
                }
                $gamePlayer._y = $gamePlayer._realY = Math.floor($gamePlayer._y) - yoff;
                event.gravity = 0;
                event.hasUsedJump = false;
                event.hasUsedDoubleJump = false;
                if(isMoved) {
                    event.pSprite.rotation = 0; event.pSprite.anchor.x = event.pSprite.anchor.y = 1;
                    $gamePlayer.setStepAnime(true);
                    event.animeTimer++;
                    if(event.animeTimer % 6 == 0) $gamePlayer.updatePattern();
                } else {
                    $gamePlayer.setStepAnime(false);
                }
                event.framesSinceGrounded = 0;
            }
        } else {
            if((!$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 - 0.1), Math.floor($gamePlayer._y + 0.9), 8) ||
            !$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 + 0.1), Math.floor($gamePlayer._y + 0.9), 8)) && 
            (!$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 - 0.1), Math.floor($gamePlayer._y +0.5), 8) ||
            !$gamePlayer.isMapPassable(-Math.round(-$gamePlayer._x+0.5 + 0.1), Math.floor($gamePlayer._y+ 0.5), 8))) {
                //bonk
                event.gravity = 0.1;
            }
        }
        if(!event.grounded){
            $gamePlayer.setStepAnime(false);
            event.framesSinceGrounded++;
        }
        // scroll
        if($gamePlayer._x > $gameMap._displayX + 17 / 2 + 1 && $gameMap._displayX < $gameMap.width() - 17.1) {
            $gameMap._displayX += 0.1;
            $gameMap._parallaxX += 0.015;
            event.parallax1.origin.x += 0.5;
            event.parallax2.origin.x += 1;
        } else if($gamePlayer._x < $gameMap._displayX + 17 / 2 - 1 && $gameMap._displayX > 0.1) {
            $gameMap._displayX -= 0.1;
            $gameMap._parallaxX -= 0.015;
            event.parallax1.origin.x -= 0.5;
            event.parallax2.origin.x -= 1;
        }
        if($gamePlayer._y > $gameMap._displayY + 13 / 2 + 3 && $gameMap._displayY < $gameMap.height() - (13.1)) {
            $gameMap._displayY += 0.1;
            $gameMap._parallaxY += 0.015;
            event.parallax1.y -= 0.5;
            event.parallax2.y -= 1;
        } else if($gamePlayer._y < $gameMap._displayY + 13 / 2 + 1 && $gameMap._displayY > 0.1 ) {
            $gameMap._displayY -= 0.1;
            $gameMap._parallaxY -= 0.015;
            event.parallax1.y += 0.5;
            event.parallax2.y += 1;
        }

        Util.CheckEventTriggers();

        // if($gamePlayer._y >= 22.5) {
        //     $gameSelfSwitches.setValue([$gameMap._mapId, event._eventId, 'B'], true);
        // }

        if(SceneManager._scene.bottomMap && $gamePlayer._realY >= $gameMap.height() - 0.5) {
            $gamePlayer.reserveTransfer(SceneManager._scene.bottomMap, $gamePlayer._x, 0, $gamePlayer._direction, 0);
            this.PrepareSideScrollTransfer();
        } else if(SceneManager._scene.topMap && $gamePlayer._realY <= -0.1) {
            $gamePlayer.reserveTransfer(SceneManager._scene.topMap, $gamePlayer._x, "end", $gamePlayer._direction, 0);
            this.PrepareSideScrollTransfer();
        }
    }
})(Util)