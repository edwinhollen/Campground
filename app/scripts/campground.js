
'use strict';
Array.prototype.shuffle = function() {
    for (var c = this.length - 1; c > 0; c--) {
        var b = Math.floor(Math.random() * (c + 1));
        var a = this[c];
        this[c] = this[b];
        this[b] = a;
    }
};

var Track = function(trackData, albumData, bandData){
    console.log(
        'New track', '\n',
        'Track data', trackData,
        'Album data', albumData,
        'Band data', bandData
    );

    this.track_id = trackData.track_id;
    this.album_id = trackData.album_id;
    this.band_id = trackData.band_id;

    this.track_title = trackData.title;
    this.track_streaming_url = trackData.streaming_url;
    this.track_url = trackData.url;
    this.album_url = albumData.url;
    this.album_title = albumData.title;
    this.album_art_small_url = albumData.small_art_url || null;
    this.album_art_large_url = albumData.large_art_url || null;

    this.band_url = bandData.url;
    this.band_name = bandData.name;
};

var Campground = {
    playlist: [],
    currentTrackId: null,
    api: {
        api_key: 'vatnajokull',
        getUrlData: function(url, callback){
            $.getJSON(
                'http://api.bandcamp.com/api/url/1/info'+
                '?key='+this.api_key+
                '&callback=?'+
                '&url='+url
            ).success(function(data){
                callback(data);
            }).fail(function(){
                window.alert('Oops, Bandcamp failed to resolve that URL. Make sure you entered a track or album URL.');
            });
        },
        getBandData: function(band_id, callback){
            $.getJSON(
                'http://api.bandcamp.com/api/band/3/info'+
                '?key='+this.api_key+
                '&callback=?'+
                '&band_id='+band_id
            ).success(function(data){
                callback(data);
            }).fail(function(){
                window.alert('Failed to retrieve band data.');
            });
        },
        getAlbumData: function(album_id, callback){
            $.getJSON(
                'http://api.bandcamp.com/api/album/2/info'+
                '?key='+this.api_key+
                '&callback=?'+
                '&album_id='+album_id
            ).success(function(data){
                callback(data);
            }).fail(function(){
                window.alert('Failed to retrieve album data');
            });
        },
        getTrackData: function(track_id, callback){
            $.getJSON(
                'http://api.bandcamp.com/api/track/3/info'+
                '?key='+this.api_key+
                '&callback=?'+
                '&track_id='+track_id
            ).success(function(data){
                callback(data);
            }).fail(function(){
                window.alert('Failed to retrieve track data');
            });
        }
    },
    loadPlaylist: function(){
        var savedPlaylist = JSON.parse(localStorage.playlist || '[]');
        if(savedPlaylist.length < 1){
            console.log('No saved playlist found');
        }else{
            console.log('Found saved playlist with '+savedPlaylist.length+' tracks, loading');
            savedPlaylist.forEach(function(savedTrack){
                //console.log('Adding saved track', savedTrack);
                this.playlist.push(savedTrack);
            }.bind(this));
        }
    },
    savePlaylist: function(){
        console.log('Saving playlist locally');
        localStorage.playlist = JSON.stringify(this.playlist);
    },
    clearPlaylist: function(){
        while(this.playlist.length > 0){
            this.playlist.pop();
        }
    },
    play: function(){
        this.isPlaying = true;
        if(this.currentTrackId === null){
            this.currentTrackId = this.playlist[0].track_id;
        }
        var currentTrackElement = $('[data-trackid="'+this.currentTrackId+'"]');
        currentTrackElement.children('audio')[0].play();
        currentTrackElement.addClass('playing');
        $('#btn_playPause').html('Pause');
    },
    pause: function(){
        this.isPlaying = false;
        $('audio').each(function(){
            this.pause();
        });
        $('#btn_playPause').html('Play');
    },
    playPause: function(){
        this.isPlaying ? this.pause() : this.play();
    },
    removeTrack: function(track_id){
        for(var k in this.playlist){
            if(this.playlist[k].track_id === track_id){
                this.playlist.splice(k, 1);
                return;
            }
        }
    },
    nextTrack: function(){
        // get key of current track
        console.log('nextTrack');
        $('.playing').removeClass('playing');
        for(var k in this.playlist){
            k = parseInt(k);
            if(this.playlist[k].track_id === this.currentTrackId){
                console.log('Current '+this.currentTrackId);
                this.currentTrackId = (this.playlist[parseInt(k)+1] || this.playlist[0]).track_id;
                console.log('Next '+this.currentTrackId);
                this.playPause();
                this.playPause();
                return;
            }
        }
    },
    shufflePlaylist: function(){
        this.pause();
        this.playlist.shuffle();
        this.currentTrackId = null;
    },
    addAlbumToPlaylist: function(album_id, bandData){
        //console.log('Adding album to playlist', album_id, bandData);
        // get album data
        var that = this;
        this.api.getAlbumData(album_id, function(albumData){
            albumData.tracks.forEach(function(trackData){
                that.playlist.push(new Track(trackData, albumData, bandData));
            });
        }.bind(that));
    },

    addTrackToPlaylist: function(track_id, bandData){
        //console.log('Adding track to playlist', track_id, bandData);
        // get track data
        var that = this;
        this.api.getTrackData(track_id, function(trackData){
            // get album data
            this.api.getAlbumData(trackData.album_id, function(albumData){
                this.playlist.push(new Track(trackData, albumData, bandData));
            });
        }.bind(that));
    },
    getTrackOrAlbum: function(){
        var str = $('#inpt_trackOrAlbum').val().trim();
        this.api.getUrlData(str, function(urlData){
            if(urlData.band_id){
                // get band data
                this.api.getBandData(urlData.band_id, function(bandData){
                    if(urlData.album_id){
                        this.addAlbumToPlaylist(urlData.album_id, bandData);
                    }else if(urlData.track_id){
                        this.addTrackToPlaylist(urlData.track_id, bandData);
                    }
                }.bind(this));
            }else{
                window.alert('Bandcamp rejected the URL');
            }
        }.bind(this));
    },
    renderPlaylist: function(){
        $('.playlist').html('');

        this.playlist.forEach(function(track){
            var compiledTrack = Handlebars.compile($('#trackTemplate').html())(track);
            $('.playlist').append(compiledTrack);
        });

        this.savePlaylist();
    }
};
