var Imported = Imported || {};
Imported["CD_MapEdit"] = true;

var CD_MapEdit = CD_MapEdit || {};

(function (_) {
    Game_Map.prototype.setTileId = function(x, y, z, id) {
        let width = $dataMap.width;
        let height = $dataMap.height;
        $dataMap.data[(z * height + y) * width + x] = id;
    };

    Game_Map.prototype.writeTile = function(x, y, z, id) {
        this.setTileId(...arguments);
        let mapId = this._mapId;
        this._modifiedTiles[mapId] = this._modifiedTiles[mapId] || [];
        this._modifiedTiles[mapId].push({x: x, y: y, z: z, id: id});
    };

    Game_Map.prototype.refreshTilemap = function() {
        SceneManager._scene._spriteset._tilemap.setData($gameMap.width(), $gameMap.height(), $gameMap.data());
        SceneManager._scene._spriteset._tilemap.refresh();
        _.flagMapNeedsSave = true;
    }

    _.flagMapNeedsSave = false;

    _.Scene_Map_prototype_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        // Load the modified tiles
        this._transfer = $gamePlayer.isTransferring();
        const mapId = this._transfer ? $gamePlayer.newMapId() : $gameMap.mapId();
        let tiles = $gameMap._modifiedTiles[mapId];
        if(tiles && tiles.length) {
            tiles.forEach(t => {
                if(t) $gameMap.setTileId(t.x, t.y, t.z, t.id);
            });
        }
        
        // do whatever else
        _.Scene_Map_prototype_onMapLoaded.apply(this,arguments);
    };

    _.Game_Map_initialize = Game_Map.prototype.initialize;
    Game_Map.prototype.initialize = function() {
        this._modifiedTiles = [];
        _.Game_Map_initialize.call(this);
    };
})(CD_MapEdit);