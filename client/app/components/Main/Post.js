import React from 'react';
import shortid from 'shortid';

class Post extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: shortid.generate(),
      playing: false,
      wavesurfer: null
    }
  }
  componentDidMount() {
    let wavesurfer = WaveSurfer.create({
      container: '#' + this.state.id,
      height: 75,
      waveColor: 'grey',
      progressColor: 'darkgrey',
      responsive: true
    })

    wavesurfer.on('ready', () => {
      this.setState(state => ({
        wavesurfer: wavesurfer
      }));
    });

    wavesurfer.on('finish', () => {
      this.setState({
        playing: false
      })
    });

    wavesurfer.load('http://' + location.host + '/audio_files/' + this.props.audio);
  }

  playPause() {
    this.state.wavesurfer.playPause();
    this.setState({
      playing: !this.state.playing
    })
  }

  render() {
    return (
      <div className="post">
        <div className="play" onClick={this.playPause.bind(this)}>
          <i className={`fa fa-${this.state.playing ? 'pause' : 'play'} fa-2x`} style={{color: 'grey'}}></i>
        </div>
        <div className="waveform-container">
          <div id={this.state.id}></div>
        </div>
      </div>
    )
  }
}
export default Post;
