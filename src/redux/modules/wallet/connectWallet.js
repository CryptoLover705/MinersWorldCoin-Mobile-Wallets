import { connect } from 'react-redux';
import { fetchWalletActionCreators } from './actions';

function mapStateToProps({ wallet }) {
    return {
        wallet
    };
}

const mapDispatchToProps = fetchWalletActionCreators;

export function connectWallet(configMapStateToProps = mapStateToProps) {
    return connect(
        configMapStateToProps,
        mapDispatchToProps,
    );
}
