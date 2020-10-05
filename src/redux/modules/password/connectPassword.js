import { connect } from 'react-redux';
import { fetchPasswordActionCreators } from './actions';

function mapStateToProps({ password }) {
    return {
        password
    };
}

const mapDispatchToProps = fetchPasswordActionCreators;

export function connectPassword(configMapStateToProps = mapStateToProps) {
    return connect(
        configMapStateToProps,
        mapDispatchToProps,
    );
}
